import React from "react";
import Database from "../database";

class GlobalChatScreen extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            page: 1,
            isLoading: false,
            hasMore: true,
            navigation: props.navigation,
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
            const res = await Database.getAllComments(this.state.page);
            const newPosts = res.comments || [];

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

}