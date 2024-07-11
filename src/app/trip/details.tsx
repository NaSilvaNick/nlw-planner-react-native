import { useEffect, useState } from "react";
import { Alert, Text, View, FlatList } from "react-native";
import { Plus } from "lucide-react-native";

import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { Input } from "@/components/input";
import { TripLink, TripLinkProps } from "@/components/tripLink";
import { Participant, ParticipantProps } from "@/components/participant";

import { colors } from "@/styles/colors";
import { validateInput } from "@/utils/validateInput";
import { linksServer } from "@/server/links-server";
import { participantsServer } from "@/server/participants-server";

type Props = {
  tripId: string
}

export function Details({ tripId }: Props) {

  const [showNewLinkModal, setShowNewLinkModal] = useState(false)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkURL, setLinkURL] = useState('')
  const [isCreatingLinkTrip, setIsCreatingLinkTrip] = useState(false)
  const [links, setLinks] = useState<TripLinkProps[]>([])
  const [participants, setParticipants] = useState<ParticipantProps[]>([])

  function resetNewLinkFields() {
    setLinkTitle("")
    setLinkURL("")
  }

  async function handleCreateTripLink() {
    try {
      if (!linkTitle.trim()) {
        return Alert.alert("Link", "Informe um titulo para o link!")
      }

      if (!validateInput.url(linkURL.trim())) {
        return Alert.alert("Link", "Link Invalido!")
      }

      setIsCreatingLinkTrip(true)

      await linksServer.create({
        tripId,
        title: linkTitle,
        url: linkURL
      })

      Alert.alert("Link", "Link criado com sucesso")
      resetNewLinkFields()
      setShowNewLinkModal(false)
      await getTripLinks()

    } catch (error) {
      console.log(error)
    } finally {
      setIsCreatingLinkTrip(false)
    }
  }

  async function getTripLinks() {
    try {
      const links = await linksServer.getLinksByTripId(tripId)
      setLinks(links)
    } catch (error) {
      console.log(error)
    }
  }

  async function getTripParticipants() {
    try {
      const participants = await participantsServer.getByTripId(tripId)
      setParticipants(participants)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    getTripLinks()
    getTripParticipants()
  }, [])

  return (
    <View className="flex-1 mt-10">
      <Text className="text-zinc-50 text-2xl font-semibold mb-2">
        Links Importantes
      </Text>

      <View className="flex-1">
        {
          links.length > 0 ? (
            <FlatList
              data={links}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <TripLink data={item} />}
              contentContainerClassName="gap-4"
            />
          ) : (
            <Text className="text-zinc-400 font-regular text-base mt-2 mb-6">
              Nenhum link adicionado.
            </Text>
          )
        }
        <Button variant="secondary" onPress={() => setShowNewLinkModal(true)}>
          <Plus color={colors.zinc[200]} size={20} />
          <Button.Title>Cadastrar um novo link</Button.Title>
        </Button>
      </View>

      <View className="flex-1 border-t border-zinc-800 mt-6">
        <Text className="text-zinc-50 text-2xl font-semibold my-6">Convidados</Text>

        <FlatList
          data={participants}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Participant data={item} />}
          contentContainerClassName="gap-4 pb-44"
          showsVerticalScrollIndicator={false}
        />
      </View>

      <Modal
        title="Cadastrar Link"
        subtitle="Todos so convidados podem visualizar os links importantes."
        visible={showNewLinkModal}
        onClose={() => setShowNewLinkModal(false)}
      >
        <View className="gap-2 mb-3">
          <Input variant="secondary">
            <Input.Field
              placeholder="Titulo do link"
              onChangeText={setLinkTitle}
              value={linkTitle}
            />
          </Input>
          <Input variant="secondary">
            <Input.Field
              placeholder="URL"
              onChangeText={setLinkURL}
              value={linkURL}
            />
          </Input>
        </View>
        <Button isLoading={isCreatingLinkTrip} onPress={handleCreateTripLink}>
          <Button.Title>Salvar Link</Button.Title>
        </Button>

      </Modal>

    </View>
  )
}