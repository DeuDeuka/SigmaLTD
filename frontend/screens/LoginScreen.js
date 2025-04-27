// screens/LoginScreen.js

import React, {useState, useEffect} from 'react';
import {View, Text, TextInput, Button, Alert, Keyboard, Vibration, Platform} from 'react-native'; // Ensure StyleSheet is included
import {useSelector} from 'react-redux';
import Database from '../database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {styles} from '../styles/screens/LoginScreen';
import Modal from "react-native-modal";

export default function LoginScreen({navigation}) {
    const {current, colors} = useSelector((state) => state.theme);
    const theme = colors[current];
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [realName, setRealName] = useState('');
    const [group, setGroup] = useState('');
    const [displayedName, setDisplayedName] = useState('');
    const [error, setError] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        async function check() {
            const user = await AsyncStorage.getItem('token');
            if (user) {
                navigation.replace('Main');
            }
        }

        check();
        // Check if running on iOS in a browser (not standalone mode)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isStandalone = "standalone" in window.navigator && window.navigator.standalone;

        if (isIOS && isSafari && !isStandalone) {
            setShowPrompt(true);
        }
    }, []);
    ;
    const handleSubmit = async () => {
        setError(null);
        try {
            let user;
            if (isLogin) {
                user = await Database.login({email, password});
            } else {
                if ((password.length > 7) && (displayedName.length > 1)) {
                    user = await Database.register({email, password, realName, group, displayedName});
                } else {
                    alert('Password or Displayed Name Too Short!');
                }
            }
            navigation.replace('Main');
        } catch (err) {
            setError(err.message);
            console.error('Auth error:', err.message);
        }
    };


    return (
        <View style={[styles.container, {backgroundColor: theme.background}]}>
            <Text style={[styles.title, {color: theme.text}]}>
                {isLogin ? 'Login' : 'Sign Up'}
            </Text>
            {error && <Text style={styles.error}>{error}</Text>}
            <TextInput
                style={[styles.input, {borderColor: theme.border, color: theme.text}]}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                placeholderTextColor={theme.text === '#000' ? '#666' : '#ccc'}
            />
            <TextInput
                style={[styles.input, {borderColor: theme.border, color: theme.text}]}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={theme.text === '#000' ? '#666' : '#ccc'}
            />
            {!isLogin && (
                <>
                    <TextInput
                        style={[styles.input, {borderColor: theme.border, color: theme.text}]}
                        placeholder="Real Name"
                        value={realName}
                        onChangeText={setRealName}
                        placeholderTextColor={theme.text === '#000' ? '#666' : '#ccc'}
                    />
                    <TextInput
                        style={[styles.input, {borderColor: theme.border, color: theme.text}]}
                        placeholder="Group (e.g., student)"
                        value={group}
                        onChangeText={setGroup}
                        placeholderTextColor={theme.text === '#000' ? '#666' : '#ccc'}
                    />
                    <TextInput
                        style={[styles.input, {borderColor: theme.border, color: theme.text}]}
                        placeholder="Displayed Name"
                        value={displayedName}
                        onChangeText={setDisplayedName}
                        placeholderTextColor={theme.text === '#000' ? '#666' : '#ccc'}
                    />
                </>
            )}
            <Button title={isLogin ? 'Login' : 'Sign Up'} onPress={handleSubmit}/>
            <Button
                title={`Switch to ${isLogin ? 'Sign Up' : 'Login'}`}
                onPress={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                    setEmail('');
                    setPassword('');
                    setRealName('');
                    setGroup('');
                    setDisplayedName('');
                }}
            />
            <Modal visible={showPrompt} style={{backgroundColor: "#111"}}>
                <View style={{alignItems: 'center', alignSelf: 'center', alignContent: 'center'}}>
                    <Text style={{color: "#fff", fontSize: 20, alignSelf: 'center', alignItems: 'center', alignContent: 'center', justifyContent: 'center'}}>
                        Нажми на кнопку поделиться, потом выбери "Add to Home Screen" чтобы установить
                    </Text>
                    {/* Add an image or icon here */}
                    <Button title="Got it" onPress={() => setShowPrompt(false)} />
                </View>
            </Modal>
        </View>
    );
}
