import React, {useEffect} from "react";
import {Image, Button, Text, View} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function StaticSystemMessageScreen({ navigation }) {

    useEffect(() => {
        isShown().then(() => {});
    });

    const isShown = async () => {
        const value = await AsyncStorage.getItem('message');
        if (value === "true"){
            navigation.replace("Main");
        }
    }

    const setShown = async () => {
        await AsyncStorage.setItem('message', 'true');
        navigation.replace('Main');
    }

    return (
        <View style={{flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000"}}>
            <Image style={{
                alignSelf: 'center',
                alignItems: 'center',
                width: 100,
                height: 100,
                marginBottom: 20}} source={require('../public/logo-rb.png')} />
            <Text style={{color:'white', textAlign: 'center', fontSize: 20, width:"70%", marginBottom: 50}}>
                В настоящий момент мы переносим сайт на другой сервер, поэтому некоторые функции могут не работать.
                <br/>
                Просим отнестись к этому с пониманием!
            </Text>
            <Button onPress={setShown} title={"OK"}/>
        </View>
    );
}