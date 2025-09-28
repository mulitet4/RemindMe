import {
  Text,
  View,
  ScrollView,
  Platform,
  Alert,
  TextInput,
} from "react-native";
import AnimatedPressable from "../src/components/AnimatedPressable";
import * as React from "react";
import { isToday, isFuture, isPast } from "date-fns";

import { SafeAreaView } from "react-native-safe-area-context";
import { Shadow } from "react-native-shadow-2";

import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import Modal from "react-native-modal";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useAppState } from "../src/utils/useAppState";
import {
  rescheduleAllIntrusiveAlarms,
  cancelIntrusiveAlarm,
  stopCurrentAlarm,
  scheduleIntrusiveAlarm,
} from "../src/utils/intrusiveAlarmManager";
import {
  scheduleAllRegularNotifications,
  cancelRegularNotification,
  initializeNotificationChannels,
  getNotificationStatus,
  scheduleConfirmationNotification,
} from "../src/utils/notificationScheduler";

// Helper function for generating unique IDs
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function triggerNotifications(data) {
  await rescheduleAllIntrusiveAlarms(data);
  await scheduleAllRegularNotifications(data);
}

async function cancelNotifs(reminder) {
  if (reminder.isIntrusive) {
    await cancelIntrusiveAlarm(reminder.id);
  } else {
    await cancelRegularNotification(reminder.id);
  }
}

export default function App() {
  const [reminders, setReminders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const [isReminderModalVisible, setIsReminderModalVisible] =
    React.useState(false);
  const [editingReminder, setEditingReminder] = React.useState(null);
  const [isActionModalVisible, setIsActionModalVisible] = React.useState(false);
  const [selectedActionReminder, setSelectedActionReminder] =
    React.useState(null);

  // State for ReminderModal
  const [reminderMessage, setReminderMessage] = React.useState("");
  const [alarmType, setAlarmType] = React.useState("reminder"); // 'reminder', 'alarm'
  const [reminderType, setReminderType] = React.useState("one-off"); // 'one-off', 'daily', 'weekly', 'monthly'
  const [selectedTime, setSelectedTime] = React.useState(new Date());
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [pickerMode, setPickerMode] = React.useState("date"); // "date" or "time"

  const appState = useAppState();

  React.useEffect(() => {
    if (appState === "active") {
      stopCurrentAlarm();

      // Debug: Log notification status when app becomes active
      getNotificationStatus().then((status) => {
        console.log("📱 App became active - Notification Status:", status);
      });
    }
  }, [appState]);

  React.useEffect(() => {
    const foregroundSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log(
          "Notification received:",
          notification.request.content.title
        );
      });

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const { reminderId } = response.notification.request.content.data;

        if (response.actionIdentifier === "snooze") {
          console.log("Snooze requested for reminder:", reminderId);
        } else if (response.actionIdentifier === "dismiss") {
          // Notification is automatically dismissed
        } else {
          // Default tap - you could open the reminder for editing
          console.log("Opening reminder for edit:", reminderId);
        }
      });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Initialising
  async function init() {
    // Initialize notification channels for Android (centralized in alarmScheduler.js)
    await initializeNotificationChannels();

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("Notification permissions not granted");
    }
    let reminders = await SecureStore.getItemAsync("items");
    setLoading(false);

    if (reminders == null || reminders == [] || reminders == undefined) {
      return;
    }

    reminders = JSON.parse(reminders);
    setReminders(reminders);

    // Reschedule all alarms with both alarm systems
    await rescheduleAllIntrusiveAlarms(reminders);
    await scheduleAllRegularNotifications(reminders);

    console.log("init function finished.");
  }

  React.useEffect(() => {
    init();
  }, []);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setReminders((prevReminders) => [...prevReminders]); // Trigger re-render to re-categorize
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  // ReminderModal logic
  React.useEffect(() => {
    if (isReminderModalVisible) {
      if (editingReminder) {
        // Editing mode
        setReminderMessage(editingReminder.message);
        setAlarmType(editingReminder.isIntrusive ? "alarm" : "reminder");
        setSelectedTime(
          editingReminder.timer ? new Date(editingReminder.timer) : new Date()
        );
        setReminderType(editingReminder.recurring || "one-off");
      } else {
        // New reminder mode
        setReminderMessage("");
        setAlarmType("reminder");
        setReminderType("one-off");
        setSelectedTime(new Date());
      }
    }
  }, [isReminderModalVisible, editingReminder]);

  const handleSaveReminder = async () => {
    if (!reminderMessage.trim()) {
      Alert.alert("Error", "Please enter a reminder message");
      return;
    }

    try {
      let reminders = await SecureStore.getItemAsync("items");
      reminders = reminders ? JSON.parse(reminders) : [];

      const reminderData = {
        id: editingReminder ? editingReminder.id : uid(),
        message: reminderMessage.trim(),
        timer: selectedTime.toISOString(),
        isIntrusive: alarmType === "alarm",
        recurring: reminderType === "one-off" ? null : reminderType,
        createdAt: editingReminder
          ? editingReminder.createdAt
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingReminder) {
        const index = reminders.findIndex((r) => r.id === editingReminder.id);
        if (index !== -1) {
          reminders[index] = reminderData;
        }
      } else {
        reminders.push(reminderData);
      }

      await SecureStore.setItemAsync("items", JSON.stringify(reminders));
      setReminders(reminders);

      if (editingReminder) {
        await cancelNotifs(editingReminder);
      }

      await triggerNotifications(reminders);

      if (
        !editingReminder &&
        reminderData.recurring &&
        scheduleConfirmationNotification
      ) {
        await scheduleConfirmationNotification(reminderData);
      }

      setIsReminderModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to save reminder");
      console.error("Error saving reminder:", error);
    }
  };

  const onTimeChange = (event, selectedDate) => {
    const currentDate = selectedDate || selectedTime;

    if (Platform.OS === "android") {
      if (pickerMode === "date") {
        setShowDatePicker(false);
        if (event.type === "set") {
          const newDateTime = new Date(currentDate);
          newDateTime.setHours(selectedTime.getHours());
          newDateTime.setMinutes(selectedTime.getMinutes());
          setSelectedTime(newDateTime);
          setPickerMode("time");
          setShowTimePicker(true);
        }
      } else if (pickerMode === "time") {
        setShowTimePicker(false);
        if (event.type === "set") {
          const newDateTime = new Date(selectedTime);
          newDateTime.setHours(currentDate.getHours());
          newDateTime.setMinutes(currentDate.getMinutes());
          setSelectedTime(newDateTime);
        }
      }
    } else {
      setSelectedTime(currentDate);
    }
  };

  const showDateTimePicker = () => {
    if (Platform.OS === "android") {
      setPickerMode("date");
      setShowDatePicker(true);
    } else {
      setPickerMode("datetime");
      setShowTimePicker(true);
    }
  };

  // ActionModal logic
  const handleDeleteReminder = async () => {
    if (!selectedActionReminder) return;
    console.log("handleDelete triggered for reminder:", selectedActionReminder);
    try {
      console.log(
        `Cancelling notifications for reminder ID: ${selectedActionReminder.id}`
      );
      await cancelNotifs(selectedActionReminder);

      console.log("Fetching reminders from SecureStore for deletion.");
      let reminders = await SecureStore.getItemAsync("items");
      reminders = reminders ? JSON.parse(reminders) : [];
      console.log("Current reminders:", reminders);

      const originalLength = reminders.length;
      reminders = reminders.filter((r) => r.id !== selectedActionReminder.id);
      console.log(
        `Reminders filtered. New length: ${reminders.length}. Original length: ${originalLength}`
      );

      console.log("Saving updated reminders to SecureStore.");
      await SecureStore.setItemAsync("items", JSON.stringify(reminders));
      setReminders(reminders);
      console.log("Reminders state updated.");

      console.log("Triggering notification rescheduling after deletion.");
      await triggerNotifications(reminders);

      setIsActionModalVisible(false);
      console.log("ActionModal closed.");
    } catch (error) {
      console.error("Error deleting reminder:", error);
    }
  };

  const handleEditReminderFromAction = () => {
    if (!selectedActionReminder) return;
    console.log("handleEdit triggered for reminder:", selectedActionReminder);
    setIsActionModalVisible(false);
    handleEditReminder(selectedActionReminder);
  };

  const handleAddNewReminder = () => {
    setEditingReminder(null);
    setIsReminderModalVisible(true);
  };

  const handleEditReminder = (reminder) => {
    setEditingReminder(reminder);
    setIsReminderModalVisible(true);
  };

  const handleOpenActionModal = (reminder) => {
    setSelectedActionReminder(reminder);
    setIsActionModalVisible(true);
  };

  const categorizeReminders = (reminders) => {
    const now = new Date();

    const categorized = {
      recurring: [],
      today: [],
      upcoming: [],
      past: [],
    };

    if (!reminders || reminders.length === 0) {
      return categorized;
    }

    reminders.forEach((reminder) => {
      if (reminder.recurring) {
        categorized.recurring.push(reminder);
      } else if (reminder.timer) {
        const reminderTime = new Date(reminder.timer);
        if (isPast(reminderTime) && !isToday(reminderTime)) {
          categorized.past.push(reminder);
        } else if (isToday(reminderTime)) {
          if (reminderTime < now) {
            categorized.past.push(reminder);
          } else {
            categorized.today.push(reminder);
          }
        } else if (isFuture(reminderTime)) {
          categorized.upcoming.push(reminder);
        } else {
          categorized.past.push(reminder);
        }
      } else {
        categorized.today.push(reminder);
      }
    });

    // Sort each category
    const sortByTime = (a, b) => {
      if (!a.timer) return 1;
      if (!b.timer) return -1;
      return new Date(a.timer) - new Date(b.timer);
    };

    categorized.today.sort(sortByTime);
    categorized.upcoming.sort(sortByTime);
    categorized.recurring.sort(sortByTime);
    categorized.past.sort((a, b) => new Date(b.timer) - new Date(a.timer));

    return categorized;
  };

  const categorizedReminders = categorizeReminders(reminders);

  const dailyReminders = categorizedReminders.recurring.filter(
    (r) => r.recurring === "daily"
  );
  const weeklyReminders = categorizedReminders.recurring.filter(
    (r) => r.recurring === "weekly"
  );
  const monthlyReminders = categorizedReminders.recurring.filter(
    (r) => r.recurring === "monthly"
  );

  const hasReminders =
    reminders &&
    reminders.length > 0 &&
    (dailyReminders.length > 0 ||
      weeklyReminders.length > 0 ||
      monthlyReminders.length > 0 ||
      categorizedReminders.today.length > 0 ||
      categorizedReminders.upcoming.length > 0 ||
      categorizedReminders.past.length > 0);

  const renderReminder = (reminder, index, isPastDue = false) => {
    let colorList = ["BAFDA2", "E3DFF2", "FEFC96", "F7D6B4"];
    let color = colorList[index % colorList.length];

    if (isPastDue) {
      color = "D3D3D3";
    }

    return (
      <AnimatedPressable
        key={reminder.id}
        onPress={() => handleOpenActionModal(reminder)}
      >
        <View className='mx-4 mb-3'>
          <Shadow
            stretch={true}
            offset={[6, 6]}
            distance={0}
            startColor='#000000ff'
            style={{ borderRadius: 12 }}
          >
            <View
              style={{ backgroundColor: `#${color}` }}
              className='rounded-xl border-2 p-3'
            >
              <Text
                style={{ fontFamily: "Archivo" }}
                className={`text-base mb-1 ${isPastDue ? "text-gray-600 line-through" : ""}`}
              >
                {reminder.message}
              </Text>
              {reminder.timer && (
                <View className='flex-row items-center mt-2'>
                  <Text className='text-xs mr-1'>
                    {reminder.isIntrusive ? "🚨" : "🔔"}
                  </Text>
                  <Text
                    style={{ fontFamily: "Archivo" }}
                    className={`text-xs ${isPastDue ? "text-gray-500" : "text-gray-700"}`}
                  >
                    {isPastDue ? "EXPIRED: " : ""}
                    {new Date(reminder.timer).toLocaleString()}
                  </Text>
                </View>
              )}
              {reminder.recurring && (
                <View className='flex-row items-center mt-2'>
                  <Text className='text-xs mr-1'>🔄</Text>
                  <Text
                    style={{ fontFamily: "Archivo" }}
                    className='text-xs text-gray-700'
                  >
                    {reminder.recurring.charAt(0).toUpperCase() +
                      reminder.recurring.slice(1)}{" "}
                    reminder
                  </Text>
                </View>
              )}
            </View>
          </Shadow>
        </View>
      </AnimatedPressable>
    );
  };

  const renderCategory = (title, reminders, isPastDue = false) => {
    if (reminders.length === 0) return null;
    return (
      <View>
        <Text
          style={{ fontFamily: "Archivo" }}
          className='text-lg font-bold mx-4 mt-4 mb-2'
        >
          {title}
        </Text>
        {reminders.map((reminder, index) =>
          renderReminder(reminder, index, isPastDue)
        )}
      </View>
    );
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <SafeAreaView className='h-full bg-white'>
      <View className='flex flex-col h-full'>
        {/* Reminders List */}
        <ScrollView className='flex-1'>
          {loading ? (
            <Text>loading</Text>
          ) : hasReminders ? (
            <>
              {renderCategory("Daily", dailyReminders)}
              {renderCategory("Weekly", weeklyReminders)}
              {renderCategory("Monthly", monthlyReminders)}
              {renderCategory("Today", categorizedReminders.today)}
              {renderCategory("Upcoming", categorizedReminders.upcoming)}
              {renderCategory("Expired", categorizedReminders.past, true)}
            </>
          ) : (
            <View className='flex-1 items-center justify-center p-8'>
              <Text
                style={{ fontFamily: "Archivo" }}
                className='text-gray-500 text-center text-lg'
              >
                No reminders yet!{"\n"}Tap the + button to add one.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <View className='absolute right-4 bottom-4 p-4 flex-col items-center'>
          <Shadow
            className='rounded-xl'
            offset={[5, 5]}
            distance={0}
            startColor='#000000ff'
            style={{ borderRadius: 12 }}
          >
            <AnimatedPressable
              onPress={handleAddNewReminder}
              className='border-2 w-16 h-16 flex items-center justify-center rounded-xl bg-[#BAFDA2] fixed'
            >
              <Text className='text-2xl'>+</Text>
            </AnimatedPressable>
          </Shadow>
        </View>

        {/* Reminder Modal */}
        <Modal
          isVisible={isReminderModalVisible}
          onBackdropPress={() => setIsReminderModalVisible(false)}
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
                      placeholder='Enter your reminder'
                      multiline={true}
                      style={{ fontFamily: "Archivo" }}
                      className='border-2 rounded-2xl p-3 bg-[#BAFDA2] w-full min-h-[30px]'
                    />
                  </Shadow>
                </View>

                {/* AlarmTypeSelector Inlined */}
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
                        description:
                          "A standard notification. Can be once, daily, weekly or monthly",
                      },
                      {
                        key: "alarm",
                        title: "Alarm",
                        description:
                          "A loud, persistent alarm for important events.",
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
                          className={`w-52 min-h-20 border-2 rounded-xl p-3 ${
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
                          <Text
                            style={{ fontFamily: "Archivo" }}
                            className='text-xs text-gray-700 text-center'
                          >
                            {type.description}
                          </Text>
                        </AnimatedPressable>
                      </Shadow>
                    ))}
                  </View>
                </View>

                {/* ReminderTypeSelector Inlined - Only show for reminders */}
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

                {/* Time section - Only show for alarms */}
                {alarmType === "alarm" && (
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
                        <Text
                          style={{ fontFamily: "Archivo" }}
                          className='text-sm'
                        >
                          {new Date(selectedTime).toLocaleDateString()} at{" "}
                          {formatTime(selectedTime)}
                        </Text>
                        <Text className='text-lg'>🕐</Text>
                      </AnimatedPressable>
                    </Shadow>

                    {showDatePicker && Platform.OS === "android" && (
                      <DateTimePicker
                        testID='datePicker'
                        value={selectedTime}
                        mode='date'
                        display='default'
                        onChange={onTimeChange}
                        minimumDate={new Date()}
                      />
                    )}

                    {showTimePicker && Platform.OS === "android" && (
                      <DateTimePicker
                        testID='timePicker'
                        value={selectedTime}
                        mode='time'
                        is24Hour={false}
                        display='default'
                        onChange={onTimeChange}
                      />
                    )}

                    {showTimePicker && Platform.OS === "ios" && (
                      <View>
                        <DateTimePicker
                          testID='dateTimePicker'
                          value={selectedTime}
                          mode='datetime'
                          is24Hour={false}
                          display='spinner'
                          onChange={onTimeChange}
                          minimumDate={new Date()}
                        />
                        <AnimatedPressable
                          onPress={() => setShowTimePicker(false)}
                          className='mt-2 p-2 bg-blue-500 rounded'
                        >
                          <Text className='text-white text-center'>Done</Text>
                        </AnimatedPressable>
                      </View>
                    )}
                  </View>
                )}

                <View className='flex flex-row mt-4 gap-2'>
                  <Shadow
                    className='rounded-xl'
                    offset={[4, 4]}
                    distance={0}
                    startColor='#000000ff'
                    style={{ borderRadius: 12 }}
                  >
                    <AnimatedPressable
                      onPress={handleSaveReminder}
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
                      onPress={() => setIsReminderModalVisible(false)}
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

        {/* Action Modal */}
        <Modal
          isVisible={isActionModalVisible && !!selectedActionReminder}
          onModalHide={() => setSelectedActionReminder(null)}
          onBackdropPress={() => setIsActionModalVisible(false)}
          backdropOpacity={0.5}
          animationIn='zoomIn'
          animationOut='zoomOut'
          animationInTiming={150}
          animationOutTiming={150}
          hideModalContentWhileAnimating={true}
          backdropTransitionOutTiming={1}
          useNativeDriver={true}
        >
          {selectedActionReminder && (
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
                    className='m-3 text-lg font-bold text-center'
                  >
                    What would you like to do?
                  </Text>

                  <View className='bg-[#FEFC96] p-3 rounded-lg border-2 mb-4 max-w-xs'>
                    <Text
                      style={{ fontFamily: "Archivo" }}
                      className='text-sm text-center'
                      numberOfLines={3}
                    >
                      {selectedActionReminder.message}
                    </Text>
                    {selectedActionReminder.timer && (
                      <Text
                        style={{ fontFamily: "Archivo" }}
                        className='text-xs text-gray-600 text-center mt-1'
                      >
                        📅{" "}
                        {new Date(
                          selectedActionReminder.timer
                        ).toLocaleString()}
                      </Text>
                    )}
                  </View>

                  <View className='flex flex-row space-x-3'>
                    <Shadow
                      className='rounded-xl'
                      offset={[4, 4]}
                      distance={0}
                      startColor='#000000ff'
                      style={{ borderRadius: 12 }}
                    >
                      <AnimatedPressable
                        onPress={handleEditReminderFromAction}
                        className='border-2 rounded-xl px-4 py-3 bg-[#BAFDA2]'
                      >
                        <Text
                          style={{ fontFamily: "Archivo" }}
                          className='font-medium'
                        >
                          ✏️ Edit
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
                        onPress={handleDeleteReminder}
                        className='border-2 rounded-xl px-4 py-3 bg-[#FFB3B3]'
                      >
                        <Text
                          style={{ fontFamily: "Archivo" }}
                          className='font-medium'
                        >
                          🗑️ Delete
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
                        onPress={() => setIsActionModalVisible(false)}
                        className='border-2 rounded-xl px-4 py-3 bg-[#F7D6B4]'
                      >
                        <Text
                          style={{ fontFamily: "Archivo" }}
                          className='font-medium'
                        >
                          Cancel
                        </Text>
                      </AnimatedPressable>
                    </Shadow>
                  </View>
                </View>
              </Shadow>
            </View>
          )}
        </Modal>
      </View>
    </SafeAreaView>
  );
}
