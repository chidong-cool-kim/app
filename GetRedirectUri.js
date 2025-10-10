import React from 'react';
import { Text, View } from 'react-native';
import { getRedirectUrl } from 'expo-auth-session';

export default function GetRedirectUri() {
  console.log('redirect URI:', getRedirectUrl());

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>터미널을 확인해주세요!</Text>
    </View>
  );
}