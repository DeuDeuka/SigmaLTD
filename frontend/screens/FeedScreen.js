import React from 'react';
import {SafeAreaView, View} from 'react-native';
import { styles } from '../styles/screens/FeedScreen';
import { FloatingButton } from '../components/FloatingButton';
import Database from '../database';
import SuperScrollList from "../components/SuperScrollList";

export default class FeedScreen extends React.Component {
    navigation = null;
    constructor(props) {
        super(props);
        this.navigation = props.navigation;
        this.flatListRef = React.createRef();
    }

    render() {
        return (
            <SafeAreaView style={[styles.container, {backgroundColor: "#000"}]}>
                <SuperScrollList navigation={this.navigation} loader={Database.getAllPosts}/>
                <FloatingButton
                    onPress={() => this.navigation.navigate('CreatePost')}
                    visible={true}
                />
            </SafeAreaView>
        );
    }
}
