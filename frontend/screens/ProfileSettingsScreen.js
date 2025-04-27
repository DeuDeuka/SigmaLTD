// screens/ProfileSettingsScreen.js

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native'; // Ensure StyleSheet is included
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/screens/ProfileScreen';
import ProfileModal from '../components/ProfileModal';
import {Menu} from "../MainNavigator";

export default function ProfileSettingsScreen({navigation}) {
  const { current, colors } = useSelector((state) => state.theme);
  const theme = colors[current];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Menu navigation={navigation} header={true}/>
      <ProfileModal navigation={navigation} />
    </View>
  );
}