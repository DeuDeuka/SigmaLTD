// screens/ProfileSettingsScreen.js

import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {useSelector} from 'react-redux';
import {styles} from '../styles/screens/ProfileScreen';
import {Menu} from "../MainNavigator";
import Database from "../database";

export default function ProfileScreen({navigation}) {
    const {current, colors} = useSelector((state) => state.theme);
    const theme = colors[current];
    const [user, setUser] = useState({});

    useEffect(() => {
        Database.getCurrentUser()
    })

    return (
        <View style={[styles.container, {backgroundColor: theme.background}]}>
            <Menu navigation={navigation} header={true}/>
            <Text style={[styles.header, {color: theme.text}]}>
                Profile
            </Text>
            <Text style={{color: theme.text, marginBottom: 20}}>
                Username: CurrentUser
            </Text>
        </View>
    );
}