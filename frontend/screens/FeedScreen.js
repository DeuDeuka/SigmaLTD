import React from 'react';
import { SafeAreaView } from 'react-native';
import { styles } from '../styles/screens/FeedScreen';
import { FloatingButton } from '../components/FloatingButton';
import Database from '../database';
import SuperScrollList from "../components/SuperScrollList";

export default class FeedScreen extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            navigation: props.navigation,
        };
        this.flatListRef = React.createRef();
    }

    render() {
        const {navigation} = this.props;
        return (
            <SafeAreaView style={[styles.container, {backgroundColor: "#000"}]}>
                <SuperScrollList navigation={navigation} loader={Database.getAllPosts}/>
                <FloatingButton
                    onPress={() => navigation.navigate('CreatePost')}
                    visible={true}
                />
            </SafeAreaView>
        );
    }
}
