import React from "react";
import { View, Text } from "react-native";
import Modal from "react-native-modal";
import { Shadow } from "react-native-shadow-2";
import AnimatedPressable from "./AnimatedPressable";

const ActionModal = ({ isVisible, onClose, reminder, onEdit, onDelete }) => {
  if (!reminder) return null;

  return (
    <Modal
      isVisible={isVisible}
      onModalHide={onClose}
      onBackdropPress={onClose}
      backdropOpacity={0.5}
      animationIn='zoomIn'
      animationOut='zoomOut'
      animationInTiming={150}
      animationOutTiming={150}
      hideModalContentWhileAnimating={true}
      backdropTransitionOutTiming={1}
      useNativeDriver={true}
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
                {reminder.message}
              </Text>
              {reminder.timer && (
                <Text
                  style={{ fontFamily: "Archivo" }}
                  className='text-xs text-gray-600 text-center mt-1'
                >
                  📅 {new Date(reminder.timer).toLocaleString()}
                </Text>
              )}
            </View>

            <View className='flex flex-row gap-2'>
              <Shadow
                className='rounded-xl'
                offset={[4, 4]}
                distance={0}
                startColor='#000000ff'
                style={{ borderRadius: 12 }}
              >
                <AnimatedPressable
                  onPress={onEdit}
                  className='border-2 min-w-24 flex-row justify-center rounded-xl px-4 py-3 bg-[#BAFDA2]'
                >
                  <Text
                    style={{ fontFamily: "Archivo" }}
                    className='font-medium'
                  >
                    Edit
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
                  onPress={onDelete}
                  className='border-2 min-w-24 flex-row justify-center rounded-xl px-4 py-3 bg-[#FFB3B3]'
                >
                  <Text
                    style={{ fontFamily: "Archivo" }}
                    className='font-medium'
                  >
                    Delete
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
                  className='border-2 min-w-24 flex-row justify-center rounded-xl px-4 py-3 bg-[#F7D6B4]'
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
    </Modal>
  );
};

export default ActionModal;
