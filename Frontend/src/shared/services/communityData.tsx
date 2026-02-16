import React from 'react';
import { Globe, Bike, Backpack, Flame, Camera, Tent, Trees, Star, Footprints } from 'lucide-react';

export interface Community {
	id: string;
	name: string;
	icon?: React.ReactNode;
	iconKey?: string; // For serialization
	members: number;
	description: string;
	isCustom?: boolean;
	joined?: boolean;
	role?: string; // For profile display
}

export const iconRegistry: Record<string, React.ReactNode> = {
	'globe': <Globe size={24} />,
	'bike': <Bike size={24} />,
	'backpack': <Backpack size={24} />,
	'flame': <Flame size={24} />,
	'camera': <Camera size={24} />,
	'tent': <Tent size={24} />,
	'trees': <Trees size={24} />,
	'star': <Star size={24} />,
	'footprints': <Footprints size={24} />
};

export const availableIconKeys = Object.keys(iconRegistry);

export const defaultCommunities: Community[] = [
	{ id: '1', name: 'Trekkers Global', iconKey: 'globe', members: 12543, description: 'The largest community for hiking enthusiasts.', role: 'Member' },
	{ id: '2', name: 'Mountain Bikers', iconKey: 'bike', members: 8560, description: 'Shredding trails and climbing peaks.', role: 'Member' },
	{ id: '3', name: 'Gear Heads', iconKey: 'backpack', members: 3420, description: 'Discussing the latest and greatest outdoor gear.', role: 'Member' },
	{ id: '4', name: 'Campfire Stories', iconKey: 'flame', members: 5670, description: 'Share your best adventure stories.', role: 'Member' },
	{ id: '5', name: 'Nature Photography', iconKey: 'camera', members: 18900, description: 'Capturing the wild.', role: 'Member' },
];

export const getIconByKey = (key?: string): React.ReactNode => {
	if (!key) return <Globe size={24} />;
	return iconRegistry[key] || <Globe size={24} />;
};
