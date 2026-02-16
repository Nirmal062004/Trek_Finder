interface Message {
	id: number;
	user: string;
	text: string;
	timestamp: string;
	isSystem: boolean;
	avatar?: string;
}

type MessageCallback = (message: Message) => void;

class WebSocketService {
	private messageCallbacks: MessageCallback[] = [];
	private isConnected: boolean = false;
	private timer: NodeJS.Timeout | null = null;

	private randomResponses = [
		"That sounds amazing!",
		"Has anyone been to the Valley of Flowers recently?",
		"I'm planning a trip next month.",
		"Don't forget to pack extra socks!",
		"The view from the top is breathtaking.",
		"Is it safe to trek solo there?",
		"Check out the gallery for my latest photos!",
		"Count me in!"
	];

	private randomUsers = [
		"Alex", "Sarah", "Mike", "Priya", "Rahul", "Explorer_123"
	];

	connect(userName: string, room: string = 'general') {
		if (this.isConnected) return;

		console.log(`Connecting WebSocket for ${userName} in room ${room}...`);
		this.isConnected = true;

		// Simulated connection success
		setTimeout(() => {
			this.notify({
				id: Date.now(),
				user: 'System',
				text: `Joined ${room}. Chat is simulated.`,
				timestamp: new Date().toISOString(),
				isSystem: true
			});
		}, 500);

		// Start random incoming messages to make it feel alive
		this.startSimulation();
	}

	sendMessage(text: string) {
		if (!this.isConnected) {
			console.warn('Cannot send message: WebSocket not connected.');
			return;
		}
		console.log('Sending message to server:', text);
		// In a real app, the server would broadcast this. 
		// We don't echo back "You" because the UI optimistically adds it.
		// But we might trigger a random reply.
		if (Math.random() > 0.7) {
			setTimeout(() => this.simulateIncomingMessage(), 2000 + Math.random() * 2000);
		}
	}

	private startSimulation() {
		// Send a random message every 10-20 seconds
		if (this.timer) clearInterval(this.timer);
		this.timer = setInterval(() => {
			if (this.isConnected && Math.random() > 0.6) {
				this.simulateIncomingMessage();
			}
		}, 15000);
		// Initial welcome message from a "bot" or user
		setTimeout(() => this.simulateIncomingMessage(), 3000);
	}

	private simulateIncomingMessage() {
		if (!this.isConnected) return;
		const user = this.randomUsers[Math.floor(Math.random() * this.randomUsers.length)];
		const text = this.randomResponses[Math.floor(Math.random() * this.randomResponses.length)];

		this.notify({
			id: Date.now() + Math.random(),
			user: user,
			text: text,
			timestamp: new Date().toISOString(),
			isSystem: false,
			avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user}`
		});
	}

	onMessage(callback: MessageCallback) {
		this.messageCallbacks.push(callback);
	}

	private notify(message: Message) {
		this.messageCallbacks.forEach(cb => cb(message));
	}

	disconnect() {
		if (this.isConnected) {
			console.log('Disconnecting WebSocket...');
			this.isConnected = false;
			this.messageCallbacks = [];
			if (this.timer) clearInterval(this.timer);
		}
	}
}

export const wsService = new WebSocketService();
export default wsService;
