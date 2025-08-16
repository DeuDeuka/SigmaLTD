// screens/SettingsScreen.js

import React from 'react';
import { View, Text, Button } from 'react-native';
import { styles } from '../styles/screens/SettingsScreen';

export default function SettingsScreen({ navigation }) {
    const { current, colors } =  {
        current: 'light',
        colors: { light: { text: '#FFF', background: '#000' } },
    };
    const theme = colors[current];

    const handleThemeChange = (selectedTheme) => {
        console.log("nope");
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
            {/*<Text style={[styles.subtitle, { color: theme.text }]}>Choose Theme</Text>*/}
            {/*<Button title="Light Theme" onPress={() => handleThemeChange('light')} />*/}
            <Button title="Dark Theme" onPress={() => handleThemeChange('dark')} />
            <Text style={{ color: theme.text, marginTop: 10 }}>
                Current Theme: {current}
            </Text>
            <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
    );
}
