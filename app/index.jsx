import {
  Text,
  View,
  ScrollView,
  Platform,
  Alert,
  TextInput,
} from "react-native";
import AnimatedPressable from "../src/components/AnimatedPressable";
import ActionModal from "../src/components/ActionModal";
import ReminderModal from "../src/components/ReminderModal";
import * as React from "react";
import { isToday, isFuture, isPast } from "date-fns";

import { SafeAreaView } from "react-native-safe-area-context";
import { Shadow } from "react-native-shadow-2";

import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
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

        // Note: Snooze and dismiss actions only come from intrusive alarms now
        // Regular notifications (daily/weekly/monthly/one-time) no longer have action buttons
        if (response.actionIdentifier === "snooze") {
          console.log("Snooze requested for intrusive alarm:", reminderId);
          // Intrusive alarm snooze is handled by expo-alarm-module automatically
        } else if (response.actionIdentifier === "dismiss") {
          console.log("Dismiss requested for intrusive alarm:", reminderId);
          // Intrusive alarm dismiss is handled by expo-alarm-module automatically
        } else {
          // Default tap - could open the reminder for editing
          console.log("Notification tapped:", reminderId);
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
      <View key={reminder.id} className='mx-4 mb-3'>
        <Shadow
          stretch={true}
          offset={[5, 5]}
          distance={0}
          startColor='#000000ff'
          style={{ borderRadius: 12 }}
        >
          <AnimatedPressable onPress={() => handleOpenActionModal(reminder)}>
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
          </AnimatedPressable>
        </Shadow>
      </View>
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
          renderReminder(reminder, index, isPastDue, reminder.id)
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

        <ReminderModal
          isVisible={isReminderModalVisible}
          onClose={() => setIsReminderModalVisible(false)}
          onSave={handleSaveReminder}
          editingReminder={editingReminder}
          reminderMessage={reminderMessage}
          setReminderMessage={setReminderMessage}
          alarmType={alarmType}
          setAlarmType={setAlarmType}
          reminderType={reminderType}
          setReminderType={setReminderType}
          selectedTime={selectedTime}
          onTimeChange={onTimeChange}
          showDateTimePicker={showDateTimePicker}
          showDatePicker={showDatePicker}
          showTimePicker={showTimePicker}
          pickerMode={pickerMode}
        />

        <ActionModal
          isVisible={isActionModalVisible}
          onClose={() => setIsActionModalVisible(false)}
          reminder={selectedActionReminder}
          onEdit={handleEditReminderFromAction}
          onDelete={handleDeleteReminder}
        />
      </View>
    </SafeAreaView>
  );
}
