import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Keyboard, TouchableOpacity, View } from "react-native";
import { CalendarRange, Info, MapPin, Settings2, Calendar as IconCalendar } from "lucide-react-native";
import dayjs from "dayjs";

import { Input } from "@/components/input";
import { Loading } from "@/components/loading";

import { colors } from "@/styles/colors";
import { TripDetails, TripServer } from "@/server/trip-server";
import { Button } from "@/components/button";
import { Activities } from "./activities";
import { Details } from "./details";
import { Modal } from "@/components/modal";
import { Calendar } from "@/components/calendar";
import { calendarUtils, DatesSelected } from "@/utils/calendarUtils";
import { DateData } from "react-native-calendars";

type TripData = TripDetails & {
  when: string
}

enum MODAL {
  NONE = 0,
  UPDATE_TRIP = 1,
  CALENDAR = 2
}

export default function Trip() {

  const { id: tripId } = useLocalSearchParams<{ id: string }>()

  const [isLoadingTrip, setIsLoadingTrip] = useState(true)
  const [isUpdatingTrip, setIsUpdatingTrip] = useState(false)
  const [tripDetails, setTripDetails] = useState({} as TripData)
  const [options, setOptions] = useState<'activity' | 'details'>('activity')
  const [showModal, setShowModal] = useState(MODAL.NONE)
  const [destination, setDestination] = useState("")
  const [selectedDates, setSelectedDates] = useState({} as DatesSelected)

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
      if (!tripId) {
        return
      }

      if (!destination || !selectedDates.startsAt || !selectedDates.endsAt) {
        return Alert.alert(
          "Atualizar viagem", "Lembre-se de, além de preencher o destino, selecione data de inicio e fim da viagem."
        )
      }

      await TripServer.update({
        id: tripId,
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

      if (!tripId) { return router.back() }

      const trip = await TripServer.getById(tripId)

      const maxLengthDestination = 14
      const destinationText =
        trip.destination.length > maxLengthDestination
          ? trip.destination.slice(0, maxLengthDestination) + '...'
          : trip.destination

      const starts_at = dayjs(trip.starts_at).format('DD')
      const ends_at = dayjs(trip.ends_at).format('DD')
      const month = dayjs(trip.ends_at).format('MMM')

      setDestination(tripDetails.destination)
      // setSelectedDates()

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

      {options === "activity" && <Activities />}
      {options === "details" && <Details />}

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
        <Button onPress={handleUpdateTrip} isLoading={isUpdatingTrip}>
          <Button.Title>Atualizar</Button.Title>
        </Button>
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
    </View>
  )
}