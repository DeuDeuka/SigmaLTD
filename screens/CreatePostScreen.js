import {SafeAreaView} from "react-native";
import {CreatePost} from "../components/CreatePost";
import {Menu} from "../MainNavigator";
import React from "react";


export const CreatePostScreen = ({navigation}) => {
    return (
        <SafeAreaView style={{backgroundColor: "#000", flex: 1}}>
            <Menu navigation={navigation} header={true}/>
            <CreatePost navigation={navigation} />
        </SafeAreaView>
    );
}