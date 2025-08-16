import React from 'react';
import {SafeAreaView, View} from 'react-native';
import { styles } from '../styles/screens/FeedScreen';
import Database from '../database';
import SuperScrollList from "../components/SuperScrollList";

export default class FollowingScreen extends React.Component {
    navigation = null;
    constructor(props) {
        super(props);
        this.navigation = props.navigation;
        this.flatListRef = React.createRef();
        this.superScrollListRef = React.createRef();
    }

    componentDidMount() {
        // Слушаем изменения в навигации для обновления при изменении подписок
        this.unsubscribe = this.navigation.addListener('focus', () => {
            this.refreshPosts();
        });
    }

    componentWillUnmount() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    refreshPosts = () => {
        if (this.superScrollListRef.current) {
            this.superScrollListRef.current.refresh();
        }
    };

    render() {
        return (
            <SafeAreaView style={[styles.container, {backgroundColor: "#000"}]}>
                <SuperScrollList 
                    ref={this.superScrollListRef}
                    navigation={this.navigation} 
                    loader={Database.getFollowingPosts}
                />
            </SafeAreaView>
        );
    }
}
