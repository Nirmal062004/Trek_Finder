export interface MediaItem {
    id: string;
    type: 'image' | 'video';
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
    {
        id: 'andhra-pradesh',
        name: 'Andhra Pradesh',
        subtitle: 'Eastern Ghats & temple trails',
        districts: [
            {
                id: 'chittoor', name: 'Chittoor', media: [
                    { id: 'chittoor-1', type: 'image', src: '/assets/img/image.jpg', title: 'Horsley Hills Trek', location: 'Chittoor, AP' },
                    { id: 'chittoor-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Talakona Falls Trail', location: 'Chittoor, AP' },
                ]
            },
            {
                id: 'visakhapatnam', name: 'Visakhapatnam', media: [
                    { id: 'vizag-1', type: 'image', src: '/assets/img/image.jpg', title: 'Araku Valley Trek', location: 'Vizag, AP' },
                ]
            },
        ],
    },
    {
        id: 'arunachal',
        name: 'Arunachal Pradesh',
        subtitle: 'Mountain passes & monasteries',
        districts: [
            {
                id: 'tawang', name: 'Tawang', media: [
                    { id: 'tawang-1', type: 'image', src: '/assets/img/image.jpg', title: 'Sela Pass Trek', location: 'Tawang, AR' },
                    { id: 'tawang-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Monastery Trail', location: 'Tawang, AR' },
                ]
            },
            {
                id: 'ziro', name: 'Ziro', media: [
                    { id: 'ziro-1', type: 'image', src: '/assets/img/image.jpg', title: 'Ziro Valley Walk', location: 'Ziro, AR' },
                ]
            },
        ],
    },
    {
        id: 'assam',
        name: 'Assam',
        subtitle: 'River islands & wildlife trails',
        districts: [
            {
                id: 'kaziranga', name: 'Kaziranga', media: [
                    { id: 'kaziranga-1', type: 'image', src: '/assets/img/image.jpg', title: 'Grassland Trail', location: 'Kaziranga, AS' },
                    { id: 'kaziranga-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Rhino Safari Walk', location: 'Kaziranga, AS' },
                ]
            },
            {
                id: 'haflong', name: 'Haflong', media: [
                    { id: 'haflong-1', type: 'image', src: '/assets/img/image.jpg', title: 'Haflong Lake Trek', location: 'Haflong, AS' },
                ]
            },
        ],
    },
    {
        id: 'bihar',
        name: 'Bihar',
        subtitle: 'Ancient ruins & hilltop temples',
        districts: [
            {
                id: 'rajgir', name: 'Rajgir', media: [
                    { id: 'rajgir-1', type: 'image', src: '/assets/img/image.jpg', title: 'Griddhakuta Hill Climb', location: 'Rajgir, BR' },
                    { id: 'rajgir-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Hot Spring Trail', location: 'Rajgir, BR' },
                ]
            },
        ],
    },
    {
        id: 'chhattisgarh',
        name: 'Chhattisgarh',
        subtitle: 'Waterfalls & tribal forests',
        districts: [
            {
                id: 'bastar', name: 'Bastar', media: [
                    { id: 'bastar-1', type: 'image', src: '/assets/img/image.jpg', title: 'Chitrakote Falls Trek', location: 'Bastar, CG' },
                    { id: 'bastar-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Kanger Valley Walk', location: 'Bastar, CG' },
                ]
            },
        ],
    },
    {
        id: 'goa',
        name: 'Goa',
        subtitle: 'Forest hikes & hidden waterfalls',
        districts: [
            {
                id: 'north-goa', name: 'North Goa', media: [
                    { id: 'north-goa-1', type: 'image', src: '/assets/img/image.jpg', title: 'Dudhsagar Viewpoint', location: 'North Goa' },
                    { id: 'north-goa-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Tambdi Surla Trail', location: 'North Goa' },
                    { id: 'north-goa-3', type: 'image', src: '/assets/img/image.jpg', title: 'Chapora Fort Walk', location: 'North Goa' },
                ]
            },
            {
                id: 'south-goa', name: 'South Goa', media: [
                    { id: 'south-goa-1', type: 'image', src: '/assets/img/image.jpg', title: 'Cabo de Rama Fort', location: 'South Goa' },
                ]
            },
        ],
    },
    {
        id: 'gujarat',
        name: 'Gujarat',
        subtitle: 'Coastal cliffs & arid landscapes',
        districts: [
            {
                id: 'kutch', name: 'Kutch', media: [
                    { id: 'kutch-1', type: 'image', src: '/assets/img/image.jpg', title: 'White Rann Trail', location: 'Kutch, GJ' },
                ]
            },
            {
                id: 'gir-somnath', name: 'Gir Somnath', media: [
                    { id: 'gir-1', type: 'image', src: '/assets/img/image.jpg', title: 'Gir Forest Walk', location: 'Gir, GJ' },
                    { id: 'gir-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Girnar Mountain Trek', location: 'Junagadh, GJ' },
                ]
            },
        ],
    },
    {
        id: 'haryana',
        name: 'Haryana',
        subtitle: 'Aravalli foothills & nature parks',
        districts: [
            {
                id: 'morni', name: 'Morni Hills', media: [
                    { id: 'morni-1', type: 'image', src: '/assets/img/image.jpg', title: 'Morni Hills Trek', location: 'Panchkula, HR' },
                    { id: 'morni-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Tikkar Taal Walk', location: 'Panchkula, HR' },
                ]
            },
        ],
    },
    {
        id: 'himachal',
        name: 'Himachal Pradesh',
        subtitle: 'High-altitude trails & alpine lakes',
        districts: [
            {
                id: 'kullu', name: 'Kullu', media: [
                    { id: 'kullu-1', type: 'image', src: '/assets/img/image.jpg', title: 'Beas Valley Trek', location: 'Kullu, HP' },
                    { id: 'kullu-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Riverside Pine Walk', location: 'Kullu, HP' },
                    { id: 'kullu-3', type: 'image', src: '/assets/img/image.jpg', title: 'Solang Ridge', location: 'Kullu, HP' },
                ]
            },
            {
                id: 'kangra', name: 'Kangra', media: [
                    { id: 'kangra-1', type: 'image', src: '/assets/img/image.jpg', title: 'Triund Sunset', location: 'Kangra, HP' },
                    { id: 'kangra-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Dhauladhar View', location: 'Kangra, HP' },
                ]
            },
        ],
    },
    {
        id: 'jharkhand',
        name: 'Jharkhand',
        subtitle: 'Plateau forests & cascading falls',
        districts: [
            {
                id: 'ranchi', name: 'Ranchi', media: [
                    { id: 'ranchi-1', type: 'image', src: '/assets/img/image.jpg', title: 'Hundru Falls Trek', location: 'Ranchi, JH' },
                    { id: 'ranchi-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Jonha Falls Walk', location: 'Ranchi, JH' },
                ]
            },
            {
                id: 'netarhat', name: 'Netarhat', media: [
                    { id: 'netarhat-1', type: 'image', src: '/assets/img/image.jpg', title: 'Netarhat Sunrise Point', location: 'Latehar, JH' },
                ]
            },
        ],
    },
    {
        id: 'karnataka',
        name: 'Karnataka',
        subtitle: 'Coffee plantations & misty hills',
        districts: [
            {
                id: 'coorg', name: 'Coorg', media: [
                    { id: 'coorg-1', type: 'image', src: '/assets/img/image.jpg', title: 'Tadiandamol Peak', location: 'Coorg, KA' },
                    { id: 'coorg-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Coffee Estate Trail', location: 'Coorg, KA' },
                ]
            },
            {
                id: 'chikmagalur', name: 'Chikmagalur', media: [
                    { id: 'chikmagalur-1', type: 'image', src: '/assets/img/image.jpg', title: 'Mullayanagiri Trek', location: 'Chikmagalur, KA' },
                ]
            },
        ],
    },
    {
        id: 'kerala',
        name: 'Kerala',
        subtitle: 'Tea gardens & bamboo forests',
        districts: [
            {
                id: 'idukki', name: 'Idukki', media: [
                    { id: 'idukki-1', type: 'image', src: '/assets/img/image.jpg', title: 'Meesapulimala Trek', location: 'Idukki, KL' },
                    { id: 'idukki-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Tea Estate Walk', location: 'Idukki, KL' },
                ]
            },
            {
                id: 'wayanad', name: 'Wayanad', media: [
                    { id: 'wayanad-1', type: 'image', src: '/assets/img/image.jpg', title: 'Chembra Peak', location: 'Wayanad, KL' },
                ]
            },
        ],
    },
    {
        id: 'madhya-pradesh',
        name: 'Madhya Pradesh',
        subtitle: 'Forest reserves & sandstone trails',
        districts: [
            {
                id: 'pachmarhi', name: 'Pachmarhi', media: [
                    { id: 'pachmarhi-1', type: 'image', src: '/assets/img/image.jpg', title: 'Bee Falls Walk', location: 'Pachmarhi, MP' },
                    { id: 'pachmarhi-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Jata Shankar Cave Trail', location: 'Pachmarhi, MP' },
                ]
            },
            {
                id: 'panna', name: 'Panna', media: [
                    { id: 'panna-1', type: 'image', src: '/assets/img/image.jpg', title: 'Pandav Falls Trek', location: 'Panna, MP' },
                ]
            },
        ],
    },
    {
        id: 'maharashtra',
        name: 'Maharashtra',
        subtitle: 'Western Ghats trails & forts',
        districts: [
            {
                id: 'pune', name: 'Pune', media: [
                    { id: 'pune-1', type: 'image', src: '/assets/img/image.jpg', title: 'Rajgad Fort Trek', location: 'Pune, MH' },
                    { id: 'pune-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Sinhagad Sunrise', location: 'Pune, MH' },
                    { id: 'pune-3', type: 'image', src: '/assets/img/image.jpg', title: 'Torna Fort Trail', location: 'Pune, MH' },
                ]
            },
            {
                id: 'raigad', name: 'Raigad', media: [
                    { id: 'raigad-1', type: 'image', src: '/assets/img/image.jpg', title: 'Raigad Fort Trek', location: 'Raigad, MH' },
                    { id: 'raigad-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Sahyadri Trail', location: 'Raigad, MH' },
                ]
            },
            {
                id: 'satara', name: 'Satara', media: [
                    { id: 'satara-1', type: 'image', src: '/assets/img/image.jpg', title: 'Kaas Plateau Walk', location: 'Satara, MH' },
                ]
            },
        ],
    },
    {
        id: 'manipur',
        name: 'Manipur',
        subtitle: 'Hill ridges & Loktak shores',
        districts: [
            {
                id: 'senapati', name: 'Senapati', media: [
                    { id: 'senapati-1', type: 'image', src: '/assets/img/image.jpg', title: 'Dzukou Valley Trek', location: 'Senapati, MN' },
                    { id: 'senapati-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Mao Ridge Walk', location: 'Senapati, MN' },
                ]
            },
        ],
    },
    {
        id: 'meghalaya',
        name: 'Meghalaya',
        subtitle: 'Living root bridges & waterfalls',
        districts: [
            {
                id: 'east-khasi', name: 'East Khasi Hills', media: [
                    { id: 'khasi-1', type: 'image', src: '/assets/img/image.jpg', title: 'Double Decker Bridge', location: 'Cherrapunji, ML' },
                    { id: 'khasi-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Rainbow Falls Trail', location: 'Cherrapunji, ML' },
                ]
            },
            {
                id: 'west-garo', name: 'West Garo Hills', media: [
                    { id: 'garo-1', type: 'image', src: '/assets/img/image.jpg', title: 'Nokrek Peak Trek', location: 'Garo Hills, ML' },
                ]
            },
        ],
    },
    {
        id: 'mizoram',
        name: 'Mizoram',
        subtitle: 'Blue mountains & bamboo groves',
        districts: [
            {
                id: 'aizawl', name: 'Aizawl', media: [
                    { id: 'aizawl-1', type: 'image', src: '/assets/img/image.jpg', title: 'Phawngpui Peak Trek', location: 'Aizawl, MZ' },
                    { id: 'aizawl-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Durtlang Ridge Walk', location: 'Aizawl, MZ' },
                ]
            },
        ],
    },
    {
        id: 'nagaland',
        name: 'Nagaland',
        subtitle: 'Tribal hills & misty peaks',
        districts: [
            {
                id: 'kohima', name: 'Kohima', media: [
                    { id: 'kohima-1', type: 'image', src: '/assets/img/image.jpg', title: 'Japfu Peak Trek', location: 'Kohima, NL' },
                    { id: 'kohima-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Dzukou Valley Trail', location: 'Kohima, NL' },
                ]
            },
        ],
    },
    {
        id: 'odisha',
        name: 'Odisha',
        subtitle: 'Coastal trails & forested ghats',
        districts: [
            {
                id: 'koraput', name: 'Koraput', media: [
                    { id: 'koraput-1', type: 'image', src: '/assets/img/image.jpg', title: 'Deomali Peak Trek', location: 'Koraput, OD' },
                ]
            },
            {
                id: 'simlipal', name: 'Simlipal', media: [
                    { id: 'simlipal-1', type: 'image', src: '/assets/img/image.jpg', title: 'Simlipal Forest Walk', location: 'Mayurbhanj, OD' },
                    { id: 'simlipal-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Barehipani Falls Trail', location: 'Mayurbhanj, OD' },
                ]
            },
        ],
    },
    {
        id: 'punjab',
        name: 'Punjab',
        subtitle: 'Shivalik hillocks & heritage walks',
        districts: [
            {
                id: 'ropar', name: 'Ropar', media: [
                    { id: 'ropar-1', type: 'image', src: '/assets/img/image.jpg', title: 'Ropar Wetland Trail', location: 'Ropar, PB' },
                ]
            },
            {
                id: 'pathankot', name: 'Pathankot', media: [
                    { id: 'pathankot-1', type: 'image', src: '/assets/img/image.jpg', title: 'Ranjit Sagar Dam Trek', location: 'Pathankot, PB' },
                    { id: 'pathankot-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Nurpur Fort Walk', location: 'Pathankot, PB' },
                ]
            },
        ],
    },
    {
        id: 'rajasthan',
        name: 'Rajasthan',
        subtitle: 'Desert trails & ancient forts',
        districts: [
            {
                id: 'mount-abu', name: 'Mount Abu', media: [
                    { id: 'mount-abu-1', type: 'image', src: '/assets/img/image.jpg', title: 'Guru Shikhar Trek', location: 'Mount Abu, RJ' },
                    { id: 'mount-abu-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Nakki Lake Trail', location: 'Mount Abu, RJ' },
                ]
            },
            {
                id: 'udaipur', name: 'Udaipur', media: [
                    { id: 'udaipur-1', type: 'image', src: '/assets/img/image.jpg', title: 'Kumbhalgarh Wall Trek', location: 'Udaipur, RJ' },
                ]
            },
        ],
    },
    {
        id: 'sikkim',
        name: 'Sikkim',
        subtitle: 'Rhododendron forests & Kanchenjunga vistas',
        districts: [
            {
                id: 'gangtok', name: 'Gangtok', media: [
                    { id: 'gangtok-1', type: 'image', src: '/assets/img/image.jpg', title: 'Tsomgo Lake Trail', location: 'Gangtok, SK' },
                    { id: 'gangtok-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Monastery Walk', location: 'Gangtok, SK' },
                    { id: 'gangtok-3', type: 'image', src: '/assets/img/image.jpg', title: 'Silk Route Path', location: 'Gangtok, SK' },
                ]
            },
            {
                id: 'north-sikkim', name: 'North Sikkim', media: [
                    { id: 'nsikkim-1', type: 'image', src: '/assets/img/image.jpg', title: 'Gurudongmar Lake', location: 'North Sikkim' },
                    { id: 'nsikkim-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Lachen Valley', location: 'North Sikkim' },
                ]
            },
        ],
    },
    {
        id: 'tamil-nadu',
        name: 'Tamil Nadu',
        subtitle: 'Hill stations & valleys',
        districts: [
            {
                id: 'nilgiris', name: 'Nilgiris', media: [
                    { id: 'nilgiris-1', type: 'image', src: '/assets/img/image.jpg', title: 'Doddabetta Peak', location: 'Nilgiris, TN' },
                    { id: 'nilgiris-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Ooty Valley Walk', location: 'Nilgiris, TN' },
                ]
            },
            {
                id: 'kodaikanal', name: 'Kodaikanal', media: [
                    { id: 'kodaikanal-1', type: 'image', src: '/assets/img/image.jpg', title: 'Dolphin Nose Trek', location: 'Kodaikanal, TN' },
                ]
            },
        ],
    },
    {
        id: 'telangana',
        name: 'Telangana',
        subtitle: 'Rock formations & lake trails',
        districts: [
            {
                id: 'adilabad', name: 'Adilabad', media: [
                    { id: 'adilabad-1', type: 'image', src: '/assets/img/image.jpg', title: 'Kuntala Falls Trek', location: 'Adilabad, TS' },
                    { id: 'adilabad-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Kawal Sanctuary Walk', location: 'Adilabad, TS' },
                ]
            },
        ],
    },
    {
        id: 'tripura',
        name: 'Tripura',
        subtitle: 'Lush green hills & heritage sites',
        districts: [
            {
                id: 'dhalai', name: 'Dhalai', media: [
                    { id: 'dhalai-1', type: 'image', src: '/assets/img/image.jpg', title: 'Jampui Hills Trek', location: 'Dhalai, TR' },
                    { id: 'dhalai-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Orange Valley Walk', location: 'Dhalai, TR' },
                ]
            },
        ],
    },
    {
        id: 'uttar-pradesh',
        name: 'Uttar Pradesh',
        subtitle: 'Heritage trails & river walks',
        districts: [
            {
                id: 'chitrakoot', name: 'Chitrakoot', media: [
                    { id: 'chitrakoot-1', type: 'image', src: '/assets/img/image.jpg', title: 'Kamadgiri Parikrama', location: 'Chitrakoot, UP' },
                ]
            },
            {
                id: 'sonbhadra', name: 'Sonbhadra', media: [
                    { id: 'sonbhadra-1', type: 'image', src: '/assets/img/image.jpg', title: 'Vijaygarh Fort Trek', location: 'Sonbhadra, UP' },
                    { id: 'sonbhadra-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Chunar Fort Walk', location: 'Sonbhadra, UP' },
                ]
            },
        ],
    },
    {
        id: 'uttarakhand',
        name: 'Uttarakhand',
        subtitle: 'Meadows, glaciers & sacred peaks',
        districts: [
            {
                id: 'chamoli', name: 'Chamoli', media: [
                    { id: 'chamoli-1', type: 'image', src: '/assets/img/image.jpg', title: 'Valley of Flowers', location: 'Chamoli, UK' },
                    { id: 'chamoli-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Hemkund Trail', location: 'Chamoli, UK' },
                    { id: 'chamoli-3', type: 'image', src: '/assets/img/image.jpg', title: 'Auli Ridge', location: 'Chamoli, UK' },
                ]
            },
            {
                id: 'uttarkashi', name: 'Uttarkashi', media: [
                    { id: 'uttarkashi-1', type: 'image', src: '/assets/img/image.jpg', title: 'Kedarkantha Climb', location: 'Uttarkashi, UK' },
                    { id: 'uttarkashi-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Har Ki Dun', location: 'Uttarkashi, UK' },
                ]
            },
        ],
    },
    {
        id: 'west-bengal',
        name: 'West Bengal',
        subtitle: 'Tea hills & riverine trails',
        districts: [
            {
                id: 'darjeeling', name: 'Darjeeling', media: [
                    { id: 'darjeeling-1', type: 'image', src: '/assets/img/image.jpg', title: 'Tiger Hill Sunrise', location: 'Darjeeling, WB' },
                    { id: 'darjeeling-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Sandakphu Trek', location: 'Darjeeling, WB' },
                ]
            },
            {
                id: 'kalimpong', name: 'Kalimpong', media: [
                    { id: 'kalimpong-1', type: 'image', src: '/assets/img/image.jpg', title: 'Deolo Hill Walk', location: 'Kalimpong, WB' },
                ]
            },
        ],
    },
    // ─── UNION TERRITORIES (8) ───
    {
        id: 'andaman-nicobar',
        name: 'Andaman & Nicobar (UT)',
        subtitle: 'Mangrove walks & island trails',
        districts: [
            {
                id: 'havelock', name: 'Havelock', media: [
                    { id: 'havelock-1', type: 'image', src: '/assets/img/image.jpg', title: 'Radhanagar Coast Trail', location: 'Havelock, AN' },
                    { id: 'havelock-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Elephant Beach Walk', location: 'Havelock, AN' },
                ]
            },
            {
                id: 'baratang', name: 'Baratang', media: [
                    { id: 'baratang-1', type: 'image', src: '/assets/img/image.jpg', title: 'Limestone Cave Trek', location: 'Baratang, AN' },
                ]
            },
        ],
    },
    {
        id: 'chandigarh',
        name: 'Chandigarh (UT)',
        subtitle: 'Garden city & Shivalik trails',
        districts: [
            {
                id: 'chandigarh-city', name: 'Chandigarh', media: [
                    { id: 'chd-1', type: 'image', src: '/assets/img/image.jpg', title: 'Sukhna Lake Trail', location: 'Chandigarh, CH' },
                    { id: 'chd-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Rock Garden Walk', location: 'Chandigarh, CH' },
                ]
            },
        ],
    },
    {
        id: 'dadra-daman',
        name: 'Dadra & Nagar Haveli (UT)',
        subtitle: 'Tribal forests & river banks',
        districts: [
            {
                id: 'silvassa', name: 'Silvassa', media: [
                    { id: 'silvassa-1', type: 'image', src: '/assets/img/image.jpg', title: 'Vanganga Lake Walk', location: 'Silvassa, DN' },
                ]
            },
            {
                id: 'daman', name: 'Daman', media: [
                    { id: 'daman-1', type: 'image', src: '/assets/img/image.jpg', title: 'Devka Beach Walk', location: 'Daman, DD' },
                ]
            },
        ],
    },
    {
        id: 'delhi',
        name: 'Delhi (UT)',
        subtitle: 'Ridge walks & heritage trails',
        districts: [
            {
                id: 'north-ridge', name: 'North Ridge', media: [
                    { id: 'north-ridge-1', type: 'image', src: '/assets/img/image.jpg', title: 'Ridge Forest Walk', location: 'Delhi, DL' },
                ]
            },
            {
                id: 'south-delhi', name: 'South Delhi', media: [
                    { id: 'south-dl-1', type: 'image', src: '/assets/img/image.jpg', title: 'Hauz Khas Heritage Walk', location: 'Delhi, DL' },
                    { id: 'south-dl-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Mehrauli Trail', location: 'Delhi, DL' },
                ]
            },
        ],
    },
    {
        id: 'jammu-kashmir',
        name: 'Jammu & Kashmir (UT)',
        subtitle: 'Alpine meadows & lakes',
        districts: [
            {
                id: 'gulmarg', name: 'Gulmarg', media: [
                    { id: 'gulmarg-1', type: 'image', src: '/assets/img/image.jpg', title: 'Alpather Lake Trail', location: 'Gulmarg, JK' },
                    { id: 'gulmarg-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Gondola Meadow Walk', location: 'Gulmarg, JK' },
                ]
            },
            {
                id: 'pahalgam', name: 'Pahalgam', media: [
                    { id: 'pahalgam-1', type: 'image', src: '/assets/img/image.jpg', title: 'Aru Valley Trek', location: 'Pahalgam, JK' },
                    { id: 'pahalgam-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Betaab Valley Walk', location: 'Pahalgam, JK' },
                ]
            },
            {
                id: 'sonmarg', name: 'Sonmarg', media: [
                    { id: 'sonmarg-1', type: 'image', src: '/assets/img/image.jpg', title: 'Thajiwas Glacier Trek', location: 'Sonmarg, JK' },
                ]
            },
        ],
    },
    {
        id: 'ladakh',
        name: 'Ladakh (UT)',
        subtitle: 'High-altitude desert & lakes',
        districts: [
            {
                id: 'leh', name: 'Leh', media: [
                    { id: 'leh-1', type: 'image', src: '/assets/img/image.jpg', title: 'Pangong Lake Trek', location: 'Leh, LA' },
                    { id: 'leh-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Nubra Valley Walk', location: 'Leh, LA' },
                ]
            },
            {
                id: 'kargil', name: 'Kargil', media: [
                    { id: 'kargil-1', type: 'image', src: '/assets/img/image.jpg', title: 'Zanskar Trek', location: 'Kargil, LA' },
                    { id: 'kargil-2', type: 'video', src: '/assets/video/forest2.mp4', title: 'Suru Valley Trail', location: 'Kargil, LA' },
                ]
            },
        ],
    },
    {
        id: 'lakshadweep',
        name: 'Lakshadweep (UT)',
        subtitle: 'Lagoon paths & coral islets',
        districts: [
            {
                id: 'agatti', name: 'Agatti', media: [
                    { id: 'agatti-1', type: 'image', src: '/assets/img/image.jpg', title: 'Lagoon Boardwalk', location: 'Agatti, LD' },
                ]
            },
            {
                id: 'kavaratti', name: 'Kavaratti', media: [
                    { id: 'kavaratti-1', type: 'image', src: '/assets/img/image.jpg', title: 'Marine Aquarium Walk', location: 'Kavaratti, LD' },
                ]
            },
        ],
    },
    {
        id: 'puducherry',
        name: 'Puducherry (UT)',
        subtitle: 'Coastal trails & French heritage',
        districts: [
            {
                id: 'auroville', name: 'Auroville', media: [
                    { id: 'auroville-1', type: 'image', src: '/assets/img/image.jpg', title: 'Coastal Grove Trail', location: 'Puducherry, PY' },
                    { id: 'auroville-2', type: 'video', src: '/assets/video/forest.mp4', title: 'Auroville Forest Walk', location: 'Puducherry, PY' },
                ]
            },
            {
                id: 'promenade', name: 'Promenade', media: [
                    { id: 'promenade-1', type: 'image', src: '/assets/img/image.jpg', title: 'Beach Promenade Walk', location: 'Puducherry, PY' },
                ]
            },
        ],
    },
];
