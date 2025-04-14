import React, {forwardRef} from 'react';
import {
    View,
    FlatList,
    Text,
    Dimensions, SafeAreaView,
} from 'react-native';
import {styles} from '../styles/screens/FeedScreen';
import {FloatingButton} from '../components/FloatingButton';
import Database from '../database';
import Post from '../components/Post';
import AsyncStorage from "@react-native-async-storage/async-storage";


const FollowingScreen = forwardRef((props, ref) => {
    class FollowingScreenClass extends React.Component {
        constructor(props) {
            super(props);
            this.state = {
                data: [],
                page: 1,
                isLoading: false,
                hasMore: true,
                navigation: props.navigation,
                currentScreen: props.currentScreen,
            };
            this.flatListRef = React.createRef();
        }

        componentDidMount() {
            this.fetchData();
        }

        fetchData = async () => {
            if (this.state.isLoading || !this.state.hasMore) return;

            this.setState({ isLoading: true });
            try {
                const res = await Database.getFollowingPosts(this.state.page);
                const newPosts = res.posts || [];

                this.setState(prevState => ({
                    data: prevState.page === 1 ? newPosts : [...prevState.data, ...newPosts],
                    isLoading: false,
                    hasMore: newPosts.length > 0
                }));
            } catch (error) {
                console.error('Error fetching posts:', error);
                if (error.message === "{\"error\":\"Access denied, no valid Bearer token provided\"}") {
                    this.state.navigation.navigate('Login');
                    await AsyncStorage.removeItem('token');
                }
                this.setState({ isLoading: false });
            }
        };

        handleLoadMore = () => {
            if (!this.state.isLoading && this.state.hasMore) {
                this.setState(
                    prevState => ({ page: prevState.page + 1 }),
                    () => this.fetchData()
                );
            }
        };

        // Add this to debug scroll position
        handleScroll = (event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
        };

        renderRow = ({ item }) => {
            return (
                <View style={{ minHeight: 50 }}> {/* Ensure items have minimum height */}
                    <Post post={item} navigation={this.props.navigation} currentScreen={this.props.currentScreen} />
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
                    style={{ backgroundColor: "#000", flex: 1, alignSelf: 'center' }}
                    onScroll={this.handleScroll} // Add scroll debugging
                    ListFooterComponent={this.renderFooter}
                    showsVerticalScrollIndicator={false} // Make scroll indicator visible for debugging
                    contentContainerStyle={{ flexGrow: 1 }} // Ensure content takes up space
                    extraData={this.state.page} // Force re-render on page change
                />
            );
        };

        renderFooter = () => {
            if (!this.state.isLoading) return null;
            return (
                <View style={{ padding: 20 }}>
                    <Text>Loading more posts...</Text>
                </View>
            );
        };

        renderEmpty = () => {
            if (this.state.isLoading) return null;
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text>No posts available</Text>
                </View>
            );
        };

        render() {
            const { navigation } = this.props;
            return (
                <View style={[styles.container, { backgroundColor: "#000" }]}>
                    {this.state.data.length === 0 ? this.renderEmpty() : this.renderList()}
                </View>
            );
        }
    }
    const FollowingScreenInstance = React.createRef();
    React.useImperativeHandle(ref, () => ({
        fetchData: () => FollowingScreenInstance.current?.fetchData(),
        listRef: FollowingScreenInstance.current?.flatListRef,
    }));

    return <FollowingScreenClass ref={FollowingScreenInstance} {...props} />;
})
export default FollowingScreen;