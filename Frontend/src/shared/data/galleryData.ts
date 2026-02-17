export interface MediaItem {
    id: string;
    type: 'image';
    src: string;
    title: string;
    location: string;
    community?: string; // Icon key
    communityName?: string;
    description?: string; // For blogs/reviews
}

export interface District {
    id: string;
    name: string;
    media: MediaItem[];
}

export interface TrekState {
    id: string;
    name: string;
    subtitle: string;
    districts: District[];
}

export const galleryStates: TrekState[] = [
    { id: 'andhra-pradesh', name: 'Andhra Pradesh', subtitle: 'Eastern Ghats & temple trails', districts: [] },
    { id: 'arunachal', name: 'Arunachal Pradesh', subtitle: 'Mountain passes & monasteries', districts: [] },
    { id: 'assam', name: 'Assam', subtitle: 'River islands & wildlife trails', districts: [] },
    { id: 'bihar', name: 'Bihar', subtitle: 'Ancient ruins & hilltop temples', districts: [] },
    { id: 'chhattisgarh', name: 'Chhattisgarh', subtitle: 'Waterfalls & tribal forests', districts: [] },
    { id: 'goa', name: 'Goa', subtitle: 'Forest hikes & hidden waterfalls', districts: [] },
    { id: 'gujarat', name: 'Gujarat', subtitle: 'Coastal cliffs & arid landscapes', districts: [] },
    { id: 'haryana', name: 'Haryana', subtitle: 'Aravalli foothills & nature parks', districts: [] },
    { id: 'himachal', name: 'Himachal Pradesh', subtitle: 'High-altitude trails & alpine lakes', districts: [] },
    { id: 'jharkhand', name: 'Jharkhand', subtitle: 'Plateau forests & cascading falls', districts: [] },
    { id: 'karnataka', name: 'Karnataka', subtitle: 'Coffee plantations & misty hills', districts: [] },
    { id: 'kerala', name: 'Kerala', subtitle: 'Tea gardens & bamboo forests', districts: [] },
    { id: 'madhya-pradesh', name: 'Madhya Pradesh', subtitle: 'Forest reserves & sandstone trails', districts: [] },
    { id: 'maharashtra', name: 'Maharashtra', subtitle: 'Western Ghats trails & forts', districts: [] },
    { id: 'manipur', name: 'Manipur', subtitle: 'Hill ridges & Loktak shores', districts: [] },
    { id: 'meghalaya', name: 'Meghalaya', subtitle: 'Living root bridges & waterfalls', districts: [] },
    { id: 'mizoram', name: 'Mizoram', subtitle: 'Blue mountains & bamboo groves', districts: [] },
    { id: 'nagaland', name: 'Nagaland', subtitle: 'Tribal hills & misty peaks', districts: [] },
    { id: 'odisha', name: 'Odisha', subtitle: 'Coastal trails & forested ghats', districts: [] },
    { id: 'punjab', name: 'Punjab', subtitle: 'Shivalik hillocks & heritage walks', districts: [] },
    { id: 'rajasthan', name: 'Rajasthan', subtitle: 'Desert trails & ancient forts', districts: [] },
    { id: 'sikkim', name: 'Sikkim', subtitle: 'Rhododendron forests & Kanchenjunga vistas', districts: [] },
    { id: 'tamil-nadu', name: 'Tamil Nadu', subtitle: 'Hill stations & valleys', districts: [] },
    { id: 'telangana', name: 'Telangana', subtitle: 'Rock formations & lake trails', districts: [] },
    { id: 'tripura', name: 'Tripura', subtitle: 'Lush green hills & heritage sites', districts: [] },
    { id: 'uttar-pradesh', name: 'Uttar Pradesh', subtitle: 'Heritage trails & river walks', districts: [] },
    { id: 'uttarakhand', name: 'Uttarakhand', subtitle: 'Meadows, glaciers & sacred peaks', districts: [] },
    { id: 'west-bengal', name: 'West Bengal', subtitle: 'Tea hills & riverine trails', districts: [] },
    // Union Territories
    { id: 'andaman-nicobar', name: 'Andaman & Nicobar (UT)', subtitle: 'Mangrove walks & island trails', districts: [] },
    { id: 'chandigarh', name: 'Chandigarh (UT)', subtitle: 'Garden city & Shivalik trails', districts: [] },
    { id: 'dadra-daman', name: 'Dadra & Nagar Haveli (UT)', subtitle: 'Tribal forests & river banks', districts: [] },
    { id: 'delhi', name: 'Delhi (UT)', subtitle: 'Ridge walks & heritage trails', districts: [] },
    { id: 'jammu-kashmir', name: 'Jammu & Kashmir (UT)', subtitle: 'Alpine meadows & lakes', districts: [] },
    { id: 'ladakh', name: 'Ladakh (UT)', subtitle: 'High-altitude desert & lakes', districts: [] },
    { id: 'lakshadweep', name: 'Lakshadweep (UT)', subtitle: 'Lagoon paths & coral islets', districts: [] },
    { id: 'puducherry', name: 'Puducherry (UT)', subtitle: 'Coastal trails & French heritage', districts: [] },
];
