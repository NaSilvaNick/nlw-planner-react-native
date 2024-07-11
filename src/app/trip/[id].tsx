import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Keyboard, TouchableOpacity, View, Text } from "react-native";
import { DateData } from "react-native-calendars";
import { CalendarRange, Info, MapPin, Settings2, Calendar as IconCalendar, User, Mail } from "lucide-react-native";
import dayjs from "dayjs";

import { Activities } from "./activities";
import { Details } from "./details";

import { Input } from "@/components/input";
import { Loading } from "@/components/loading";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { Calendar } from "@/components/calendar";

import { colors } from "@/styles/colors";

import { TripDetails, TripServer } from "@/server/trip-server";
import { participantsServer } from "@/server/participants-server";

import { calendarUtils, DatesSelected } from "@/utils/calendarUtils";
import { validateInput } from "@/utils/validateInput";
import { tripStorage } from "@/storage/trip";

export type TripData = TripDetails & {
  when: string
}

enum MODAL {
  NONE = 0,
  UPDATE_TRIP = 1,
  CALENDAR = 2,
  CONFIRM_ATTENDANCE = 3
}

export default function Trip() {

  const tripParams = useLocalSearchParams<{ id: string, participant?: string }>()

  const [isLoadingTrip, setIsLoadingTrip] = useState(true)
  const [isUpdatingTrip, setIsUpdatingTrip] = useState(false)
  const [isConfirmingAttendance, setIsConfirmingAttendance] = useState(false)

  const [tripDetails, setTripDetails] = useState({} as TripData)
  const [options, setOptions] = useState<'activity' | 'details'>('activity')
  const [showModal, setShowModal] = useState(MODAL.NONE)
  const [destination, setDestination] = useState("")
  const [selectedDates, setSelectedDates] = useState({} as DatesSelected)
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")

  function handleDestinationInputChange(text: string) {
    setDestination(text)
  }

  function handleDateInputFocus() {
    Keyboard.dismiss()
  }

  function handleDateInputPressIn() {
    setShowModal(MODAL.CALENDAR)
  }

  function handleCloseModal() {
    setShowModal(MODAL.NONE)
  }

  function handleSelectDate(selectedDay: DateData) {
    const dates = calendarUtils
      .orderStartsAtAndEndsAt({
        startsAt: selectedDates.startsAt,
        endsAt: selectedDates.endsAt,
        selectedDay
      })
    setSelectedDates(dates)
  }

  function handleModalConfirmButton() {
    setShowModal(MODAL.UPDATE_TRIP)
  }

  async function handleUpdateTrip() {
    try {
      if (!tripParams.id) {
        return
      }

      if (!destination || !selectedDates.startsAt || !selectedDates.endsAt) {
        return Alert.alert(
          "Atualizar viagem", "Lembre-se de, além de preencher o destino, selecione data de inicio e fim da viagem."
        )
      }

      await TripServer.update({
        id: tripParams.id,
        destination,
        ends_at: dayjs(selectedDates.startsAt.dateString).toString(),
        starts_at: dayjs(selectedDates.endsAt.dateString).toString(),
      })

      Alert.alert(
        "Atualizar viagem", "Viagem atualizada com sucesso!", [
        {
          text: "OK",
          onPress: () => {
            getTripDetails()
            setShowModal(MODAL.NONE)
          }
        }
      ]
      )
    } catch (error) {
      console.log(error)
    } finally {
      setIsUpdatingTrip(false)
    }
  }

  async function getTripDetails() {
    try {
      setIsLoadingTrip(true)

      if (tripParams.participant) {
        setShowModal(MODAL.CONFIRM_ATTENDANCE)
      }

      if (!tripParams.id) { return router.back() }

      const trip = await TripServer.getById(tripParams.id)

      const maxLengthDestination = 14
      const destinationText =
        trip.destination.length > maxLengthDestination
          ? trip.destination.slice(0, maxLengthDestination) + '...'
          : trip.destination

      const starts_at = dayjs(trip.starts_at).format('DD')
      const ends_at = dayjs(trip.ends_at).format('DD')
      const month = dayjs(trip.ends_at).format('MMM')

      setDestination(tripDetails.destination)

      setTripDetails({
        ...trip,
        when: `${destinationText} de ${starts_at} a ${ends_at} de ${month}.`
      })

    } catch (error) {
      console.log(error)
    } finally {
      setIsLoadingTrip(false)
    }
  }

  async function handleConfirmAttendance() {
    try {
      if (!tripParams.participant || !tripParams.id) {
        return
      }

      if (!guestName.trim() || !guestEmail.trim()) {
        return Alert.alert("Confirmação", "Preencha nome e e-mail para confirmar a viagem!")
      }

      if (!validateInput.email(guestEmail.trim())) {
        return Alert.alert("Confirmação", "E-mail invalido!")
      }

      setIsConfirmingAttendance(true)

      await participantsServer.confirmTripByParticipantId({
        participantId: tripParams.participant,
        name: guestName.trim(),
        email: guestEmail.trim()
      })

      Alert.alert("Confirmação", "Viagem confirmada com sucesso!")

      await tripStorage.save(tripParams.id)

      setShowModal(MODAL.NONE)

    } catch (error) {
      console.log(error)
      Alert.alert("Confirmação", "Não foi possível confirmar a sua presença!")
    } finally {
      setIsConfirmingAttendance(false)
    }
  }

  async function handleRemoveTrip() {
    try {
      Alert.alert("Remover viagem", "Tem certeza que deseja remover a viagem?", [
        {
          text: "Não",
          style: "cancel"
        },
        {
          text: "Sim",
          onPress: async () => {
            await tripStorage.remove()
            router.navigate("/")
          }
        }
      ])
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    getTripDetails()
  }, [])

  if (isLoadingTrip) { return <Loading /> }

  return (
    <View className="flex-1 px-5 pt-16">
      <Input variant="tertiary">
        <MapPin color={colors.zinc[400]} size={20} />
        <Input.Field value={tripDetails.when} readOnly />
        <TouchableOpacity
          activeOpacity={0.5}
          className="w-9 h-9 bg-zinc-800 items-center justify-center rounded"
          onPress={() => setShowModal(MODAL.UPDATE_TRIP)}
        >
          <Settings2 color={colors.zinc[400]} size={20} />
        </TouchableOpacity>
      </Input>

      {options === "activity" && <Activities tripDetails={tripDetails} />}
      {options === "details" && <Details tripId={tripDetails.id} />}

      <View className="w-full absolute -bottom-1 self-center justify-end pb-5 z-10 bg-zinc-950">
        <View className="w-full flex-row bg-zinc-900 p-4 rounded-lg border border-zinc-800 gap-2">
          <Button
            className="flex-1"
            variant={options === "activity" ? "primary" : "secondary"}
            onPress={() => setOptions("activity")}
          >
            <CalendarRange
              color={options === 'activity' ? colors.lime[950] : colors.zinc[200]}
              size={20}
            />
            <Button.Title>Atividades</Button.Title>
          </Button>

          <Button
            className="flex-1"
            variant={options === "details" ? "primary" : "secondary"}
            onPress={() => setOptions("details")}
          >
            <Info
              color={options === 'details' ? colors.lime[950] : colors.zinc[200]}
              size={20}
            />
            <Button.Title>Detalhes</Button.Title>
          </Button>
        </View>
      </View>

      <Modal
        title="Atualizar viagem"
        subtitle="Somente quem criou a viagem pode editar"
        visible={showModal === MODAL.UPDATE_TRIP}
        onClose={() => setShowModal(MODAL.NONE)}
      >
        <View className="my-4">
          <Input variant="secondary">
            <MapPin color={colors.zinc[400]} size={20} />
            <Input.Field
              value={destination}
              placeholder='Para onde?'
              onChangeText={handleDestinationInputChange}
            />
          </Input>
          <Input variant="secondary">
            <IconCalendar color={colors.zinc[400]} size={20} />
            <Input.Field
              value={selectedDates.formatDatesInText}
              placeholder='Quando?'
              showSoftInputOnFocus={false}
              onFocus={handleDateInputFocus}
              onPressIn={handleDateInputPressIn}
            />
          </Input>
        </View>
        <Button onPress={handleUpdateTrip} isLoading={isUpdatingTrip}>
          <Button.Title>Atualizar</Button.Title>
        </Button>
        <TouchableOpacity activeOpacity={0.8} onPress={handleRemoveTrip}>
          <Text className="text-red-400 text-center mt-6">Remover viagem</Text>
        </TouchableOpacity>
      </Modal>

      <Modal
        title='Selecionar Datas'
        subtitle='Selecione a data de ida e volta da viagem'
        visible={showModal === MODAL.CALENDAR}
        onClose={handleCloseModal}
      >
        <View className='gap-4 mt-4'>
          <Calendar
            minDate={dayjs().toISOString()}
            onDayPress={handleSelectDate}
            markedDates={selectedDates.dates}
          />
          <Button onPress={handleModalConfirmButton}>
            <Button.Title>Confirmar</Button.Title>
          </Button>
        </View>
      </Modal>

      <Modal
        title="Confirmar Presença"
        visible={showModal === MODAL.CONFIRM_ATTENDANCE}
      >
        <View className="gap-4 mt-4">
          <Text className="text-zinc-400 font-regular leading-6 my-2">
            Você foi convidado(a) para participar de uma viagem para
            <Text className="font-semibold text-zinc-100">
              &nbsp;{tripDetails.destination}&nbsp;
            </Text>
            nas datas de
            <Text className="font-semibold text-zinc-100">
              &nbsp;
              {dayjs(tripDetails.starts_at).date()}
              &nbsp;a&nbsp;
              {dayjs(tripDetails.ends_at).date()}
              &nbsp;de&nbsp;
              {dayjs(tripDetails.ends_at).format("MMMM")}.
              {"\n\n"}
            </Text>
            Para confirmar sua presença na viagem, preencha os dados abaixo:
          </Text>

          <Input variant="secondary">
            <User color={colors.zinc[400]} size={20} />
            <Input.Field
              placeholder="Seu nome completo"
              value={guestName}
              onChangeText={setGuestName}
            />
          </Input>

          <Input variant="secondary">
            <Mail color={colors.zinc[400]} size={20} />
            <Input.Field
              placeholder="E-mail de confirmação"
              value={guestEmail}
              onChangeText={setGuestEmail}
            />
          </Input>

          <Button
            isLoading={isConfirmingAttendance}
            onPress={handleConfirmAttendance}
          >
            <Button.Title>Confirmar minha preseça</Button.Title>
          </Button>
        </View>
      </Modal>
    </View>
  )
}