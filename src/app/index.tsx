import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { View, Text, Image, Keyboard, Alert } from 'react-native'
import { MapPin, Calendar as IconCalendar, Settings2, UserRoundPlus, ArrowRight, AtSign } from 'lucide-react-native'
import { DateData } from 'react-native-calendars'
import dayjs from 'dayjs'

import { Input } from '@/components/input'
import { Button } from '@/components/button'
import { Modal } from '@/components/modal'
import { Calendar } from '@/components/calendar'
import { GuestEmail } from '@/components/email'
import { Loading } from '@/components/loading'

import { colors } from '@/styles/colors'
import { calendarUtils, DatesSelected } from '@/utils/calendarUtils'
import { validateInput } from '@/utils/validateInput'
import { tripStorage } from '@/storage/trip'
import { TripServer } from '@/server/trip-server'

enum STEP_FORM {
  TRIP_DETAILS = 1,
  ADD_EMAIL = 2
}

enum MODAL {
  NONE = 0,
  CALENDAR = 1,
  GUEST = 2
}

export default function Index() {
  const [stepForm, setStepForm] = useState(STEP_FORM.TRIP_DETAILS)
  const [selectedDates, setSelectedDates] = useState({} as DatesSelected)
  const [destination, setDestination] = useState('')
  const [emailToInvite, setEmailToInvite] = useState('')
  const [emailsToInvite, setEmailsToInvite] = useState<string[]>([])

  const [showModal, setShowModal] = useState(MODAL.NONE)

  const [isCreatingTrip, setIsCreatingTrip] = useState(false)
  const [isGettingTrip, setIsGettingTrip] = useState(true)

  function handleNextStepForm() {

    if (destination.trim().length === 0 || !selectedDates.startsAt || !selectedDates.endsAt) {
      return Alert.alert('Detalhes da viagem', 'Preencha todas as informações da viagem para seguir.')
    }

    if (destination.trim().length < 4) {
      return Alert.alert('Detalhes da viagem', 'O destino deve ter pelomenos 4 caracteres.')
    }

    if (stepForm === STEP_FORM.TRIP_DETAILS) {
      return setStepForm(STEP_FORM.ADD_EMAIL)
    }

    Alert.alert("Nova viagem", "Confirmar viagem?", [
      { text: "Não", style: 'cancel' },
      { text: "Sim", onPress: createTrip }
    ])
  }

  function handleAlterStepForm() {
    if (stepForm === STEP_FORM.ADD_EMAIL) {
      return setStepForm(STEP_FORM.TRIP_DETAILS)
    }
  }

  function handleCloseModal() {
    setShowModal(MODAL.NONE)
  }

  function handleDateInputFocus() {
    Keyboard.dismiss()
  }

  function handleDateInputPressIn() {
    if (stepForm === STEP_FORM.TRIP_DETAILS) {
      setShowModal(MODAL.CALENDAR)
    }
  }

  function handleSelectDate(selectedDay: DateData) {
    const dates = calendarUtils.orderStartsAtAndEndsAt({
      startsAt: selectedDates.startsAt,
      endsAt: selectedDates.endsAt,
      selectedDay
    })

    setSelectedDates(dates)
  }

  function handleModalConfirmButton() {
    setShowModal(MODAL.NONE)
  }

  function handleDestinationInputChange(text: string) {
    setDestination(text)
  }

  function handleInviteInputChange(text: string) {
    setEmailToInvite(text.toLocaleLowerCase())
  }

  function handleRemoveEmail(emailToRemove: string) {
    setEmailsToInvite((prevState) => prevState.filter((email) => email !== emailToRemove))
  }

  function handleAddEmail() {
    if (!validateInput.email(emailToInvite)) {
      return Alert.alert("Convidado", "E-mail invalido!")
    }

    const emailAlreadyExists = emailsToInvite.find((email) => email === emailToInvite)

    if (emailAlreadyExists) {
      return Alert.alert("Convidado", "Este email já foi adicionado!")
    }

    setEmailsToInvite((prevState) => [...prevState, emailToInvite])
    setEmailToInvite("")
  }

  function handlePeopleInputPressIn() {
    Keyboard.dismiss()
    setShowModal(MODAL.GUEST)
  }

  async function saveTrip(tripId: string) {
    try {
      await tripStorage.save(tripId)
      router.navigate("/trip/" + tripId)
    } catch (error) {
      Alert.alert("Salvar viagem","Não foi possível salvar o id da viagem no dispositivo.")
      console.log(error)
    }
  }

  async function createTrip() {
    try {
      setIsCreatingTrip(true)
      const { tripId } = await TripServer.create({
        destination,
        starts_at: dayjs(selectedDates.startsAt?.dateString).toString(),
        ends_at: dayjs(selectedDates.endsAt?.dateString).toString(),
        emails_to_invite: emailsToInvite
      })
      Alert.alert("Nova viagem", "Viagem criada com sucesso", [
        { text: 'OK. Continuar.', onPress: () => saveTrip(tripId)}
      ])
    } catch (error) {
      console.log(error)
      setIsCreatingTrip(false)
    }
  }

  async function getTrip() {
    try {
      const tripId = await tripStorage.get()
      
      if(!tripId) {
        return setIsGettingTrip(false)
      }

      const trip = await TripServer.getById(tripId)

      if (trip) {
        return router.navigate("/trip/" + trip.id)
      }

    } catch (error) {
      setIsGettingTrip(false)
      console.log("Error: Trip not found!")
    }
  }

  useEffect(() => {
    getTrip();
  },[])

  if (isGettingTrip) {
    return <Loading />
  }

  return (
    <View className='flex-1 items-center justify-center px-5'>
      <Image source={require('@/assets/logo.png')} className='h-8' resizeMode='contain' />
      <Image source={require('@/assets/bg.png')} className='absolute' />

      <Text className='font-regular text-lg text-center text-zinc-400 mt-3'>
        Convide seus amigos e planeje sua{"\n"}proxima viagem
      </Text>

      <View className='w-full text-zinc-400 bg-zinc-900 border-zinc-800 font-regular text-center text-lg my-3 p-4 rounded-xl'>

        <Input>
          <MapPin color={colors.zinc[400]} size={20} />
          <Input.Field
            value={destination}
            placeholder='Para onde?'
            editable={stepForm === STEP_FORM.TRIP_DETAILS}
            onChangeText={handleDestinationInputChange}
          />
        </Input>

        <Input>
          <IconCalendar color={colors.zinc[400]} size={20} />
          <Input.Field
            value={selectedDates.formatDatesInText}
            placeholder='Quando?'
            editable={stepForm === STEP_FORM.TRIP_DETAILS}
            showSoftInputOnFocus={false}
            onFocus={handleDateInputFocus}
            onPressIn={handleDateInputPressIn}
          />
        </Input>

        {stepForm == STEP_FORM.ADD_EMAIL &&
          <>
            <View className='border-b py-3 border-zinc-800'>
              <Button variant='secondary' onPress={handleAlterStepForm}>
                <Button.Title>Alterar local/data</Button.Title>
                <Settings2 color={colors.zinc[200]} size={20} />
              </Button>
            </View>

            <Input>
              <UserRoundPlus color={colors.zinc[400]} size={20} />
              <Input.Field
                placeholder='Quem estará na viagem?'
                autoCorrect={false}
                showSoftInputOnFocus={false}
                onPressIn={handlePeopleInputPressIn}
                value={emailsToInvite.length > 0
                  ? `${emailsToInvite.length} pessoa(s) convidada(s)`:``
                }
                
              />
            </Input>
          </>
        }

        <Button onPress={handleNextStepForm} isLoading={isCreatingTrip}>
          <Button.Title>
            {
              stepForm === STEP_FORM.TRIP_DETAILS
                ? 'Continuar'
                : 'Confirmar Viagem'
            }
          </Button.Title>
          <ArrowRight color={colors.lime[950]} size={20} />
        </Button>

      </View>

      <Text className='text-zinc-500 font-regular text-center text-base'>
        Ao planejar sua viagem pela plann.er você automaticamente concorda com nossos
        &nbsp;<Text className='text-zinc-300 underline'>Termos de Uso e Políticas de Privacidade.</Text>
      </Text>

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
        title='Selecionar convidados'
        subtitle='Os convidados irão receber e-mails para confirmar a participação na viagem'
        visible={showModal === MODAL.GUEST}
        onClose={handleCloseModal}
      >
        <View className='my-2 flex-wrap gap-2 border-b border-zinc-800 py-5 items-start'>
          {
            emailsToInvite.length > 0
            ? (
              emailsToInvite.map((email) => (
                <GuestEmail
                  key={email}
                  email={email}
                  onRemove={() => handleRemoveEmail(email)}
                />
              ))
            )
            : (
              <Text className='text-zinc-600 text-base font-regular'>Nenhum e-mail adicionado</Text>
            )
          }
        </View>

        <View className='gap-4 mt-4'>
          <Input variant='secondary'>
            <AtSign color={colors.zinc[400]} size={20} />
            <Input.Field
              value={emailToInvite}
              placeholder='Digite o e-mail do convidado'
              keyboardType='email-address'
              returnKeyType='send'
              onChangeText={handleInviteInputChange}
              onSubmitEditing={handleAddEmail}
            />
          </Input>
          <Button onPress={handleAddEmail}>
            <Button.Title>Convidar</Button.Title>
          </Button>
        </View>
      </Modal>
    </View>
  )
}