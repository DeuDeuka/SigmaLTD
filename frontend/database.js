import AsyncStorage from "@react-native-async-storage/async-storage";

// export const BASE_URL = 'https://www.sigmaltd.space';
export const BASE_URL = "http://localhost:3000";
export const API_URL = BASE_URL ;//+ '/api';

// Helper to get the token from AsyncStorage
const getToken = async () => {
	return await AsyncStorage.getItem('token');
};

// Helper to add Authorization header with token
const authHeaders = async () => {
	const token = await getToken();

	if (!token || token === 'undefined' || token === 'null') {
		console.warn('Token is empty or invalid:', token);
		return { 'Content-Type': 'application/json' };
	}

	return {
		'Authorization': `Bearer ${token}`,
		'Content-Type': 'application/json'
	};
};

const Database = {
	init: async () => {
		console.log('Database initialized (API mode with JWT)');
	},

	register: async ({ email, password, realName, group, displayedName }) => {
		const response = await fetch(`${API_URL}/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, realName, group, displayedName }),
		});
		if (!response.ok) throw new Error(await response.text());
		const data = await response.json();
		await AsyncStorage.setItem('token', data.token); // Store token
		return data.user; // Return user data
	},

	login: async ({ email, password }) => {
		const response = await fetch(`${API_URL}/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
		});
		if (!response.ok) throw new Error(await response.text());
		const data = await response.json();
		await AsyncStorage.setItem('token', data.token); // Store token
		return data.user; // Return user data
	},

	logout: async () => {
		await AsyncStorage.removeItem('token'); // Remove token client-side
		const response = await fetch(`${API_URL}/logout`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	getCurrentUser: async () => {
		const response = await fetch(`${API_URL}/current-user`, {
			headers: await authHeaders(),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	getUser: async (id, full) => {
		const response = await fetch(`${API_URL}/user/${id}?full=${full}`, {
			headers: await authHeaders(),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	getUsername: async (setUsername) => {
		const user = await Database.getCurrentUser();
		setUsername && setUsername(user.displayedName);
		return user.idUser;
	},
	
	changeUsername: async (username) => {
		const response = await fetch(`${API_URL}/current-user`, {
			method: 'POST',
			headers: await authHeaders(),
			body: JSON.stringify({ username }),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	changeImage: async (payload) => {
		const response = await fetch(`${API_URL}/current-user`, {
			method: 'POST',
			headers: await authHeaders(),
			body: JSON.stringify(payload),
		})
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	addPost: async (payload) => {
		try {
			const response = await fetch(`${API_URL}/posts`, {
				method: 'POST',
				headers: await authHeaders(),
				body: JSON.stringify(payload),

			});

			const responseText = await response.text();

			if (!response.ok) {
				console.error('Post error response:', responseText);
				throw new Error(responseText || 'Failed to upload post');
			}
			return JSON.parse(responseText);
		} catch (error) {
			console.error('Network error:', error);
			throw error;
		}
	},

	getAllPosts: async (page) => {
		const response = await fetch(`${API_URL}/posts?page=${page}&pageSize=10`, {
			headers: await authHeaders(),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();

	},

	getPost: async (postId) => {
		const response = await fetch(`${API_URL}/post/${postId}`, {
			headers: await authHeaders(),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	deletePost: async (postId) => {
		const response = await fetch(`${API_URL}/posts`, {
			method: 'DELETE',
			headers: await authHeaders(),
			body: JSON.stringify({ postId: postId }),
		})
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	getFollowingPosts: async (page) => {
		const response = await fetch(`${API_URL}/following-posts?page=${page}&pageSize=10`, {
			headers: await authHeaders(),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();

	},

	getAllComments: async (page) => {
		const response = await fetch(`${API_URL}/comments?page=${page}&pageSize=10`, {
			headers: await authHeaders(),
		})
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	getPostComments: async (postId) => {
		const response = await fetch(`${API_URL}/post/${postId}/comments`, {
			headers: await authHeaders(),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	getPostCommentsCount: async (postId) => {
		const response = await fetch(`${API_URL}/post/${postId}/comments-count`, {
			headers: await authHeaders(),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	addComment: async ({ postId, content }) => {
		const response = await fetch(`${API_URL}/comments`, {
			method: 'POST',
			headers: await authHeaders(),
			body: JSON.stringify({ postId, content }),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	likePost: async (postId) => {
		const response = await fetch(`${API_URL}/like-post`, {
			method: 'POST',
			headers: await authHeaders(),
			body: JSON.stringify({ postId }),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	getLikePost: async (postId) => {
		const response = await fetch(`${API_URL}/like-post?idPost=${postId}`, {
			method: 'GET',
			headers: await authHeaders(),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	unlikePost: async (postId) => {
		const response = await fetch(`${API_URL}/unlike-post`, {
			method: 'POST',
			headers: await authHeaders(),
			body: JSON.stringify({ postId }),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	getCommentLikes: async (commentId) => {
		const response = await fetch(`${API_URL}/get-comment-likes`, {
			method: 'POST',
			headers: await authHeaders(),
			body: JSON.stringify({ commentId }),
		})
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	likeComment: async (commentId) => {
		const response = await fetch(`${API_URL}/like-comment`, {
			method: 'POST',
			headers: await authHeaders(),
			body: JSON.stringify({ commentId }),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	unlikeComment: async (commentId) => {
		const response = await fetch(`${API_URL}/unlike-comment`, {
			method: 'POST',
			headers: await authHeaders(),
			body: JSON.stringify({ commentId }),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	followTag: async (tagName) => {
		const response = await fetch(`${API_URL}/follow-tag`, {
			method: 'POST',
			headers: await authHeaders(),
			body: JSON.stringify({ tagName }),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	unfollowTag: async (tagName) => {
		const response = await fetch(`${API_URL}/unfollow-tag`, {
			method: 'POST',
			headers: await authHeaders(),
			body: JSON.stringify({ tagName }),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	getFollowedTags: async () => {
		const response = await fetch(`${API_URL}/followed-tags`, {
			headers: await authHeaders(),
		});
		if (!response.ok) throw new Error(await response.text());
		return await response.json();
	},

	addCommentBase64: async ({ postId, content, isAnonymous, imageBase64 }) => {
		const token = await AsyncStorage.getItem('token');

		const payload = {
			postId,
			content,
			isAnonymous,
			imageBase64,
		};

		const response = await fetch(`${API_URL}/comments`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {throw new Error(await response.text());}

		const result = await response.json();
		return result;
	},
};

Database.init();

export default Database;