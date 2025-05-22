import React from 'react';
import {
    View,
    FlatList,
    Text,
    SafeAreaView,
} from 'react-native';
import {styles} from '../styles/screens/FeedScreen';
import {FloatingButton} from './FloatingButton';
import Post from './Post';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default class SuperScrollList extends React.Component {
    navigation = null;
    loader = null;
    constructor(props) {
        super(props);
        this.navigation = props.navigation;
        this.loader = props.loader;
        this.state = {
            data: [],
            page: 1,
            isLoading: false,
            hasMore: true,
        };
        this.flatListRef = React.createRef();
    }

    componentDidMount() {
        (this.loader && this.fetchData().then(() => console.log("Fetched data!")));
    }

    fetchData = async () => {
        if (this.state.isLoading || !this.state.hasMore) return;

        this.setState({isLoading: true});
        try {
            const res = await this.loader(this.state.page);
            const newPosts = res.posts || [];

            this.setState(prevState => ({
                data: prevState.page === 1 ? newPosts : [...prevState.data, ...newPosts],
                isLoading: false,
                hasMore: newPosts.length > 0
            }));
        } catch (error) {
            console.error('Error fetching posts:', error);
            this.navigation.replace('Login');
            await AsyncStorage.removeItem('token');
            this.setState({isLoading: false});
        }
    };

    handleLoadMore = () => {
        if (!this.state.isLoading && this.state.hasMore) {
            this.setState(
                prevState => ({page: prevState.page + 1}),
                () => this.fetchData()
            );
        }
    };

    // Add this to debug scroll position
    handleScroll = (event) => {
        const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
        const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    };

    renderRow = ({item}) => {
        return (
            <View style={{minHeight: 50}}> {/* Ensure items have minimum height */}
                <Post post={item} navigation={this.navigation} />
            </View>
        );
    };

    renderList = () => {
        return (
            <FlatList
                ref={this.flatListRef}
                data={this.state.data}
                renderItem={this.renderRow}
                keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                onEndReached={this.handleLoadMore}
                onEndReachedThreshold={0.1}
                style={{backgroundColor: "#000", flex: 1, alignSelf: 'center'}}
                onScroll={this.handleScroll} // Add scroll debugging
                ListFooterComponent={this.renderFooter}
                showsVerticalScrollIndicator={false} // Make scroll indicator visible for debugging
                contentContainerStyle={{flexGrow: 1}} // Ensure content takes up space
                extraData={this.state.page} // Force re-render on page change
            />
        );
    };

    renderFooter = () => {
        if (!this.state.isLoading) return null;
        return (
            <View style={{padding: 20}}>
                <Text>Loading more posts...</Text>
            </View>
        );
    };

    renderEmpty = () => {
        if (this.state.isLoading) return null;
        return (
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                <Text>No posts available</Text>
            </View>
        );
    };

    render() {
        return (
            <SafeAreaView style={[styles.container, {backgroundColor: "#000"}]}>
                {this.state.data.length === 0 ? this.renderEmpty() : this.renderList()}
                <FloatingButton
                    onPress={() => this.navigation.navigate('CreatePost')}
                    visible={true}
                />
            </SafeAreaView>
        );
    }
}
