import React from "react";
import { View, Text, TextInput } from "react-native";
import Modal from "react-native-modal";
import { Shadow } from "react-native-shadow-2";
import AnimatedPressable from "./AnimatedPressable";
import DateTimePicker from "@react-native-community/datetimepicker";

const ReminderModal = ({
  isVisible,
  onClose,
  onSave,
  editingReminder,
  reminderMessage,
  setReminderMessage,
  alarmType,
  setAlarmType,
  reminderType,
  setReminderType,
  selectedTime,
  onTimeChange,
  showDateTimePicker,
  showDatePicker,
  showTimePicker,
  pickerMode,
}) => {
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      backdropOpacity={0.5}
      animationIn='zoomIn'
      animationOut='slideOutDown'
      hideModalContentWhileAnimating={true}
      backdropTransitionOutTiming={1}
      avoidKeyboard={true}
    >
      <View className='flex items-center justify-center'>
        <Shadow
          className='rounded-xl'
          offset={[7, 7]}
          distance={0}
          startColor='#000000ff'
          style={{ borderRadius: 12 }}
        >
          <View className='bg-[#DAF5F0] p-4 rounded-xl flex flex-col items-center border-4'>
            <Text
              style={{ fontFamily: "Archivo" }}
              className='m-3 text-lg font-bold'
            >
              {editingReminder ? "Edit Reminder" : "Add New Reminder"}
            </Text>

            <View className='flex flex-col mb-4 w-full'>
              <Text
                style={{ fontFamily: "Archivo" }}
                className='mb-2 text-sm font-medium'
              >
                Message
              </Text>
              <Shadow
                className='rounded-2xl'
                stretch={true}
                offset={[4, 5]}
                distance={0}
                startColor='#000000ff'
                style={{ borderRadius: 12 }}
              >
                <TextInput
                  value={reminderMessage}
                  onChangeText={setReminderMessage}
                  placeholderTextColor={"#555"}
                  placeholder='Enter your reminder'
                  multiline={true}
                  style={{ fontFamily: "Archivo" }}
                  className='border-2 rounded-2xl p-3 bg-[#BAFDA2] w-full min-h-[30px]'
                />
              </Shadow>
            </View>

            <View className='w-full mb-4'>
              <Text
                style={{ fontFamily: "Archivo" }}
                className='mb-2 text-sm font-medium'
              >
                Type
              </Text>
              <View className='flex-row space-x-2 justify-around'>
                {[
                  {
                    key: "reminder",
                    title: "Reminder",
                  },
                  {
                    key: "alarm",
                    title: "Alarm",
                  },
                ].map((type) => (
                  <Shadow
                    key={type.key}
                    stretch={true}
                    offset={[4, 6]}
                    distance={0}
                    startColor='#000000ff'
                    style={{ borderRadius: 10 }}
                  >
                    <AnimatedPressable
                      onPress={() => setAlarmType(type.key)}
                      className={`min-w-48 py-4 border-2 rounded-xl justify-center ${
                        alarmType === type.key
                          ? "bg-[#BAFDA2] border-black"
                          : "bg-[#F7D6B4] border-black"
                      }`}
                    >
                      <Text
                        style={{ fontFamily: "Archivo" }}
                        className='font-bold text-center text-black'
                      >
                        {type.title}
                      </Text>
                    </AnimatedPressable>
                  </Shadow>
                ))}
              </View>
              <Text
                style={{ fontFamily: "Archivo" }}
                className='text text-black text-center mt-4 px-4'
              >
                {alarmType === "reminder"
                  ? "A standard notification. Can be once, daily, weekly or monthly"
                  : "A loud, persistent alarm for important events."}
              </Text>
            </View>

            {alarmType === "reminder" && (
              <View className='w-full mb-4'>
                <Text
                  style={{ fontFamily: "Archivo" }}
                  className='mb-2 text-sm font-medium'
                >
                  Repeat
                </Text>
                <View className='flex-row flex-wrap justify-center gap-2'>
                  {["one-off", "daily", "weekly", "monthly"].map((type) => (
                    <Shadow
                      key={type}
                      offset={[3, 3]}
                      distance={0}
                      startColor='#000000ff'
                      style={{ borderRadius: 10 }}
                    >
                      <AnimatedPressable
                        onPress={() => setReminderType(type)}
                        className={`min-w-20 px-3 py-2 border-2 rounded-xl ${
                          reminderType === type
                            ? "bg-[#BAFDA2] border-black"
                            : "bg-[#F7D6B4] border-black"
                        }`}
                      >
                        <Text
                          style={{ fontFamily: "Archivo" }}
                          className='font-bold text-center text-black'
                        >
                          {
                            {
                              "one-off": "One-off",
                              daily: "Daily",
                              weekly: "Weekly",
                              monthly: "Monthly",
                            }[type]
                          }
                        </Text>
                      </AnimatedPressable>
                    </Shadow>
                  ))}
                </View>
              </View>
            )}

            <View className='w-full mb-4'>
              <Text
                style={{ fontFamily: "Archivo" }}
                className='mb-2 text-sm font-medium'
              >
                Time
              </Text>
              <Shadow
                className='rounded-xl'
                stretch={true}
                offset={[3, 3]}
                distance={0}
                startColor='#000000ff'
                style={{ borderRadius: 8 }}
              >
                <AnimatedPressable
                  onPress={showDateTimePicker}
                  className='border-2 rounded-xl p-3 bg-[#FEFC96] w-full flex-row justify-between items-center'
                >
                  <Text style={{ fontFamily: "Archivo" }} className='text-sm'>
                    {new Date(selectedTime).toLocaleDateString()} at{" "}
                    {formatTime(selectedTime)}
                  </Text>
                  <Text className='text-lg'>🕐</Text>
                </AnimatedPressable>
              </Shadow>

              {showDatePicker && (
                <DateTimePicker
                  testID='datePicker'
                  value={selectedTime}
                  mode='date'
                  display='default'
                  onChange={onTimeChange}
                  minimumDate={new Date()}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  testID='timePicker'
                  value={selectedTime}
                  mode='time'
                  is24Hour={false}
                  display='default'
                  onChange={onTimeChange}
                />
              )}
            </View>

            <View className='flex flex-row mt-4 gap-2'>
              <Shadow
                className='rounded-xl'
                offset={[4, 4]}
                distance={0}
                startColor='#000000ff'
                style={{ borderRadius: 12 }}
              >
                <AnimatedPressable
                  onPress={onSave}
                  className='border-2 rounded-xl px-6 py-3 bg-[#BAFDA2] w-32'
                >
                  <Text
                    style={{ fontFamily: "Archivo" }}
                    className='font-medium text-center'
                  >
                    {editingReminder ? "Update" : "Add"}
                  </Text>
                </AnimatedPressable>
              </Shadow>

              <Shadow
                className='rounded-xl'
                offset={[4, 4]}
                distance={0}
                startColor='#000000ff'
                style={{ borderRadius: 12 }}
              >
                <AnimatedPressable
                  onPress={onClose}
                  className='border-2 rounded-xl px-6 py-3 bg-[#F7D6B4] w-32'
                >
                  <Text
                    style={{ fontFamily: "Archivo" }}
                    className='text-center'
                  >
                    Cancel
                  </Text>
                </AnimatedPressable>
              </Shadow>
            </View>
          </View>
        </Shadow>
      </View>
    </Modal>
  );
};

export default ReminderModal;
