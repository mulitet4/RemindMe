/**
 * Intrusive Alarm Manager for Day-Zen Reminder App
 *
 * This module handles ONLY intrusive alarms using expo-alarm-module.
 * It does NOT handle regular notifications - those use expo-notifications in alarmScheduler.js.
 *
 * Business Logic:
 * ===============
 * - INTRUSIVE ALARMS: Use expo-alarm-module for system-level, loud, persistent alarms
 * - These alarms bypass Do Not Disturb and can wake the device
 * - Only handles reminders where isIntrusive === true
 * - Regular notifications (daily/weekly/monthly/one-time) are handled by alarmScheduler.js
 *
 * Key Features:
 * =============
 * - System-level alarm that cannot be easily dismissed
 * - Plays loud alarm sound even in silent mode
 * - Shows full-screen alarm interface
 * - Can wake device from sleep
 * - Supports snooze functionality
 *
 * @author Day-Zen Development Team
 */

import * as Notifications from "expo-notifications";
import {
  scheduleAlarm,
  stopAlarm,
  removeAlarm,
  getAllAlarms,
} from "expo-alarm-module";

console.log("AlarmModule functions imported");

// Enhanced function to completely stop and dismiss current intrusive alarm
export async function stopCurrentAlarm() {
  try {
    // Stop the intrusive alarm using expo-alarm-module
    await stopAlarm();
    console.log("Intrusive alarm stopped successfully");
  } catch (e) {
    console.error("Failed to stop intrusive alarm:", e);
  }
}

export async function schedule(reminder) {
  console.log("Attempting to schedule intrusive alarm for reminder:", reminder);

  // This function ONLY handles intrusive alarms - regular notifications are handled by alarmScheduler.js
  if (!reminder.isIntrusive) {
    console.log(
      "schedule: Reminder is not intrusive. This should be handled by alarmScheduler.js"
    );
    return {
      success: false,
      reason:
        "Not an intrusive reminder - use alarmScheduler.js for regular notifications",
    };
  }

  // Handle recurring daily intrusive reminders
  if (reminder.recurring === "daily") {
    console.log("Scheduling a daily recurring intrusive reminder.");

    // Schedule the repeating daily alarm
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (reminder.timer) {
        const reminderTime = new Date(reminder.timer);
        tomorrow.setHours(
          reminderTime.getHours(),
          reminderTime.getMinutes(),
          0
        );
      }

      const repeatingAlarm = {
        uid: reminder.id,
        day: tomorrow,
        title: "Daily Intrusive Alarm",
        description: reminder.message,
        showDismiss: true,
        showSnooze: true,
        snoozeInterval: 5,
        repeating: true,
        active: true,
      };
      console.log("Scheduling repeating daily alarm:", repeatingAlarm);
      await scheduleAlarm(repeatingAlarm);
      console.log("Repeating daily intrusive alarm scheduled successfully.");
      return { success: true, type: "intrusive-daily" };
    } catch (e) {
      console.error("Failed to schedule repeating daily intrusive alarm:", e);
      return { success: false, reason: e.message };
    }
  }

  // Handle non-recurring intrusive reminders
  if (!reminder.timer) {
    console.log(
      "Scheduling intrusive alarm failed: No timer specified for reminder."
    );
    return { success: false, reason: "No timer specified" };
  }

  const reminderTime = new Date(reminder.timer);
  if (reminderTime < new Date()) {
    console.log(
      "Scheduling intrusive alarm failed: Reminder time is in the past."
    );
    return { success: false, reason: "Reminder time is in the past" };
  }

  const alarm = {
    uid: reminder.id,
    day: reminderTime,
    title: "Intrusive Alarm",
    description: reminder.message,
    showDismiss: true,
    showSnooze: true,
    snoozeInterval: 5,
    repeating: false, // One-time intrusive alarm
    active: true,
  };

  try {
    console.log("Scheduling intrusive alarm with AlarmModule:", alarm);
    await scheduleAlarm(alarm);
    console.log(
      "Intrusive alarm scheduled successfully for reminder:",
      reminder.id
    );
    return { success: true, type: "intrusive" };
  } catch (e) {
    console.error("Failed to schedule intrusive alarm:", e);
    return { success: false, reason: e.message };
  }
}

export async function cancel(reminderId) {
  console.log(`Attempting to cancel intrusive alarm with ID: ${reminderId}`);
  try {
    await removeAlarm(reminderId);
    console.log(
      `Intrusive alarm with ID: ${reminderId} cancelled successfully.`
    );
  } catch (e) {
    console.error(`Failed to cancel intrusive alarm with ID: ${reminderId}`, e);
  }
}

export async function rescheduleAll(reminders) {
  console.log("Rescheduling all intrusive alarms using expo-alarm-module...");
  try {
    // Get all existing intrusive alarms and remove them
    const activeAlarms = await getAllAlarms();
    console.log("Found active intrusive alarms to remove:", activeAlarms);
    for (const alarm of activeAlarms) {
      await removeAlarm(alarm.uid);
      console.log(`Removed existing intrusive alarm: ${alarm.uid}`);
    }

    // Filter for ONLY intrusive reminders - regular notifications are handled separately
    const intrusiveReminders = reminders.filter(
      (reminder) => reminder.isIntrusive
    );
    console.log(
      `Found ${intrusiveReminders.length} intrusive reminders to reschedule with expo-alarm-module.`
    );

    let scheduledCount = 0;
    for (const reminder of intrusiveReminders) {
      const result = await schedule(reminder);
      if (result.success) {
        scheduledCount++;
      }
    }

    console.log(
      `Finished rescheduling intrusive alarms. Successfully scheduled ${scheduledCount}/${intrusiveReminders.length} intrusive alarms.`
    );
  } catch (e) {
    console.error(
      "An error occurred during rescheduleAll for intrusive alarms:",
      e
    );
  }
}

export async function stop() {
  console.log("Attempting to stop current ringing intrusive alarm.");
  try {
    await stopAlarm();
    console.log("Stop intrusive alarm command sent successfully.");
  } catch (e) {
    console.error("Failed to stop intrusive alarm:", e);
  }
}

export async function getActive() {
  console.log("Fetching all active intrusive alarms.");
  try {
    const activeAlarms = await getAllAlarms();
    console.log("Active intrusive alarms retrieved:", activeAlarms);
    return activeAlarms;
  } catch (e) {
    console.error("Failed to get active intrusive alarms:", e);
    return [];
  }
}

export async function getAlarmSystemStatus() {
  console.log("Fetching alarm system status.");
  try {
    const activeAlarms = await getAllAlarms();
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    const status = {
      alarms: {
        scheduled: activeAlarms.length,
        details: activeAlarms,
      },
      notifications: {
        scheduled: scheduledNotifications.length,
        details: scheduledNotifications,
      },
      backgroundFetch: {
        statusText: "Unknown",
        isRegistered: false,
      },
      libraries: {
        platform: "Unknown",
        alarmManager: false,
        alarmClock: false,
      },
    };
    console.log("Alarm system status:", status);
    return status;
  } catch (e) {
    console.error("Failed to get alarm system status:", e);
    return {
      alarms: { scheduled: 0, details: [] },
      notifications: { scheduled: 0, details: [] },
      backgroundFetch: {
        statusText: "Error",
        isRegistered: false,
      },
      libraries: {
        platform: "Unknown",
        alarmManager: false,
        alarmClock: false,
      },
    };
  }
}
