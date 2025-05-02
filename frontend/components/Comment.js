// components/Comment.js

import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, Image, StyleSheet} from 'react-native';

import Database, {BASE_URL} from '../database';


export default function Comment({ comment, currentUser, toggleLike }) {
	const isMine = comment.createdByIdUser === currentUser.idUser;
	const [likes, setLikes] = useState([]);
	const [likedByMe , setLikedByMe] = useState(false);
	useEffect(() => {
		getLikes();
	})
	const getLikes = async () => {
		const data = await Database.getCommentLikes(Number(comment.idComment));
		setLikes(data);
		let tested = true;
		data.forEach((item) => {
			if (item.idUser === currentUser.idUser){
				setLikedByMe(true);
				tested = false;
			}
		})
		if (tested) {
			setLikedByMe(false);
		}
	}

	return (
		<View
			style={[
				styles.commentBubble,
				isMine ? styles.myComment : styles.otherComment,
			]}
		>
			<Text style={styles.author}>{comment.displayedName}</Text>
			<Text style={styles.commentText}>{comment.text}</Text>

			{comment.images?.map((src, i) => (
				<Image
					key={i}
					source={{uri: BASE_URL + src}}
					style={{width: 200, height: 200, marginTop: 6, borderRadius: 8}}
					resizeMode="cover"
				/>
			))}

			<TouchableOpacity onPress={() => toggleLike(comment)}>
				<Text style={{color: likedByMe ? 'red' : '#555'}}>
					❤️ {likes.length || 0}
				</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	centered: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	commentsContainer: {
		padding: 12,
	},
	commentBubble: {
		marginBottom: 10,
		padding: 12,
		borderRadius: 12,
		maxWidth: '90%',
	},
	myComment: {
		alignSelf: 'flex-end',
		backgroundColor: '#d0f0c0',
	},
	otherComment: {
		alignSelf: 'flex-start',
		backgroundColor: '#e6e6e6',
	},
	author: {
		fontWeight: 'bold',
		color: '#333',
		marginBottom: 4,
	},
	commentText: {
		color: '#000',
		fontSize: 15,
		marginBottom: 4,
	},
	inputContainer: {
		flexDirection: 'row',
		padding: 10,
		borderTopWidth: 1,
		borderColor: '#ccc',
		backgroundColor: '#f9f9f9',
		alignItems: 'center',
		flexWrap: 'wrap',
	},
	textInput: {
		flex: 1,
		borderColor: '#ccc',
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 8,
		marginRight: 10,
		fontSize: 15,
		backgroundColor: '#fff',
		color: '#000',
	},
});
