// src/utils/dvnRegistry.js
// DVN Registry - Enhanced with complete chain coverage from LayerZero metadata
// Last updated: 2026-01-13T13:06:48.271Z

export const DVN_REGISTRY = {
  "google-cloud": {
    name: "Google Cloud",
    jurisdiction: "US",
    infrastructure: "Google Cloud Platform",
    type: "Corporate",
    regulator: "None",
    confidence: "high",
    securityModel: "Institutional Trust (Proof of Authority)",
    description: "Highly reliable institutional verifier using Google cloud infrastructure",
    website: "https://cloud.google.com/web3",
    addresses: {
          "30101": "0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc",
          "30102": "0x8931bda63ebe89146d5e7488f8dd03a2b0f10930",
          "30106": "0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc",
          "30109": "0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc",
          "30110": "0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc",
          "30111": "0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc",
          "30184": "0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc",
          "30214": "0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc"
    }
  },
  "animoca-blockdaemon": {
    name: "Animoca-Blockdaemon",
    jurisdiction: "USA",
    infrastructure: "Permissioned, ISO-certified infrastructure",
    type: "Corporate",
    regulator: "None",
    confidence: "medium",
    securityModel: "Company-funded (no token)",
    description: "Institutional-grade, highly-secure cross-chain verifier network",
    website: "https://blockdaemon.com",
    addresses: {
          "30101": "0x7e65bdd15c8db8995f80abf0d6593b57dc8be437",
          "30106": "0xffe42dc3927a240f3459e5ec27eaabd88727173e",
          "30110": "0xddaa92ce2d2fac3f7c5eae19136e438902ab46cc"
    }
  },
  "chainlink": {
    name: "Chainlink CCIP",
    jurisdiction: "Cayman",
    infrastructure: "Decentralized Oracle Network",
    type: "Oracle",
    regulator: "None",
    confidence: "high",
    securityModel: "LINK token staking and oracle bonds",
    description: "Uses Chainlink DONs and risk network to secure messages",
    website: "https://chain.link",
    addresses: {
          "30101": "0x771d10d0c86e26ea8d3b778ad4d31b30533b9cbf"
    }
  },
  "axelar": {
    name: "Axelar",
    jurisdiction: "USA",
    infrastructure: "Proof-of-Stake validator chain",
    type: "DeFi",
    regulator: "None",
    confidence: "medium",
    securityModel: "AXL token staking",
    description: "Cosmos-based PoS blockchain securing cross-chain transfers",
    website: "https://axelar.network",
    addresses: {
          "30101": "0xce5b47fa5139fc5f3c8c5f4c278ad5f56a7b2016",
          "30102": "0x878c20d3685cdbc5e2680a8a0e7fb97389344fe1",
          "30106": "0xc390fd7ca590a505655eb6c454ed0783c99a2ea9",
          "30110": "0x9d3979c7e3dd26653c52256307709c09f47741e0",
          "30111": "0x218b462e19d00c8fed4adbce78f33aef88d2ccfc",
          "30145": "0x80c4c3768dd5a3dd105cf2bd868fdc50280e398b",
          "30214": "0x70cedf51c199fad12c6c0a71cd876af948059540",
          "30243": "0xb830a5afcbebb936c30c607a18bbba9f5b0a592f",
          "30290": "0x6e6359a9abe2e235ef2b82e48f0f93d1ec16afbb"
    }
  },
  "wormhole": {
    name: "Wormhole",
    jurisdiction: "N/A",
    infrastructure: "Proof-of-Authority guardian network",
    type: "Bridge",
    regulator: "None",
    confidence: "medium",
    securityModel: "No native staking; security by reputation",
    description: "Guardian network (19 validators) securing via reputation",
    website: "https://wormhole.com",
    addresses: {}
  },
  "eigenzero": {
    name: "EigenZero",
    jurisdiction: "N/A",
    infrastructure: "EigenCloud restaked infrastructure",
    type: "Restaking",
    regulator: "None",
    confidence: "high",
    securityModel: "Slashable ZRO token collateral",
    description: "Cryptoeconomic DVN via EigenCloud",
    website: "https://eigenlayer.xyz",
    addresses: {
          "30101": "0x4184dd22692c8b50d8d7ee0d7b6028e45dbf8108",
          "30102": "0x9188b373378d284c9174ae474c2b0a937924b34b",
          "30106": "0xd3333aa4fa669d3eb036676ec01cb0acaaec0cc0"
    }
  },
  "nodit": {
    name: "Nodit",
    jurisdiction: "South Korea",
    infrastructure: "Private enterprise node infrastructure",
    type: "Corporate",
    regulator: "None",
    confidence: "low",
    securityModel: "Company-funded",
    description: "Enterprise-grade DVN with AML compliance for Asia",
    website: "https://nodit.io",
    addresses: {
          "30101": "0x0cea5a94f8cd3330c4f84944bf4500f8dacd440c",
          "30102": "0xeece50190806fa57016028d31d8631419882401c",
          "30106": "0x0f56ce0ca0595792db727a21596edc2fd39be444",
          "30109": "0x4c41b4edf85dee828c2cfcc80019cb2bbcfb69a5",
          "30110": "0x4c41b4edf85dee828c2cfcc80019cb2bbcfb69a5",
          "30111": "0x1288cdad593856d7672f82e4cc5fdfe1cf59646d"
    }
  },
  "deutsche-telekom": {
    name: "Deutsche Telekom",
    jurisdiction: "Germany",
    infrastructure: "Open Telekom Cloud (GDPR-compliant)",
    type: "Telecom",
    regulator: "BNetzA",
    confidence: "high",
    securityModel: "Institutional Trust (Proof of Authority)",
    description: "Enterprise-grade DVN with high-reliability infrastructure",
    website: "https://mms.telekom.com",
    addresses: {
          "30101": "0x373a6e5c0c4e89e24819f00aa37ea370917aaff4",
          "30102": "0xf0a5c5306adbfd4e3dfd5d4b148b451c411d3878",
          "30106": "0xbe57e9e7d9eb16b92c6383792abe28d64a18c0f1",
          "30109": "0x5cccb8de6cdba9d2af9d84465653af7390fdf9dd",
          "30110": "0xeae839784e5f6c79bbaf34b6023a2f62e134ab39",
          "30111": "0x427bd19a0463fc4edc2e247d35eb61323d7e5541",
          "30112": "0x8181f551c95928c0648d4378dc4d95e847bc3945",
          "30116": "0xea928f8e62f3dac51288056015b1d4e3ecfacdac",
          "30154": "0x93d2d7aadc9f2cf5ebc88e9703e06db09b8fd85b",
          "30182": "0xca29b2be45f1d609189dc467e0f1e48ee202ed0e",
          "30184": "0xc2a0c36f5939a14966705c7cec813163faeea1f0",
          "30290": "0x45f1d581f704b3203d0a4eab2a572658d7a2e678"
    }
  },
  "nethermind": {
    name: "Nethermind",
    jurisdiction: "UK",
    infrastructure: "Self-hosted",
    type: "Research",
    regulator: "FCA",
    confidence: "high",
    securityModel: "undefined",
    description: "Ethereum infrastructure company, EU-based",
    website: "https://nethermind.io",
    addresses: {
          "30101": "0xa59ba433ac34d2927232918ef5b2eaafcf130ba5",
          "30102": "0x0321a1b9e48ccdc5a8a32c524b858e10072ef798",
          "30106": "0x1308151a7ebac14f435d3ad5ff95c34160d539a5",
          "30109": "0xbcefdadb8d24b1d36c26b522235012cd4cf162f6",
          "30110": "0xa7b5189bca84cd304d8553977c7c614329750d99",
          "30111": "0xa7b5189bca84cd304d8553977c7c614329750d99",
          "30112": "0x31f748a368a893bdb5abb67ec95f232507601a73",
          "30116": "0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b",
          "30118": "0x809cde2afcf8627312e87a6a7bbffab3f8f347c7",
          "30121": "0xd24972c11f91c1bb9eaee97ec96bb9c33cf7af24",
          "30126": "0xfe1cd27827e16b07e61a4ac96b521bdb35e00328",
          "30138": "0x790d7b1e97a086eb0012393b65a5b32ce58a04dc",
          "30145": "0x6a4c9096f162f0ab3c0517b0a40dc1ce44785e16",
          "30151": "0x6abdb569dc985504cccb541ade8445e5266e7388",
          "30154": "0x7fe673201724925b5c477d4e1a4bd3e954688cf5",
          "30165": "0xb183c2b91cf76cad13602b32ada2fd273f19009c",
          "30182": "0x6a4c9096f162f0ab3c0517b0a40dc1ce44785e16",
          "30184": "0x658947bc7956aea0067a62cf87ab02ae199ef3f3",
          "30214": "0x446755349101cb20c582c224462c3912d3584dce",
          "30238": "0x05aaefdf9db6e0f7d27fa3b6ee099edb33da029e",
          "30243": "0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b",
          "30255": "0xe4ef857900a0ca59bcb903e7b2ccfb050be7dc97",
          "30260": "0x28af4dadbc5066e994986e8bb105240023dc44b6",
          "30271": "0x9e0e95ede70f680f74480b510ff9f45c70e3da80",
          "30290": "0xb19a9370d404308040a9760678c8ca28affbbb76",
          "30367": "0x9e0e95ede70f680f74480b510ff9f45c70e3da80"
    }
  },
  "polyhedra-network": {
    name: "Polyhedra",
    jurisdiction: "Singapore",
    infrastructure: "GCP",
    type: "Startup",
    regulator: "MAS",
    confidence: "high",
    securityModel: "undefined",
    description: "Zero-knowledge proof infrastructure",
    website: "https://polyhedra.network",
    addresses: {
          "30101": "0x8ddf05f9a5c488b4973897e278b58895bf87cb24",
          "30102": "0x8ddf05f9a5c488b4973897e278b58895bf87cb24",
          "30106": "0x8ddf05f9a5c488b4973897e278b58895bf87cb24",
          "30109": "0x8ddf05f9a5c488b4973897e278b58895bf87cb24",
          "30110": "0x8ddf05f9a5c488b4973897e278b58895bf87cb24",
          "30111": "0x8ddf05f9a5c488b4973897e278b58895bf87cb24",
          "30112": "0x8ddf05f9a5c488b4973897e278b58895bf87cb24",
          "30116": "0xe014fe8c4d5c23edb7ac4011f226e869ac7ef5cc",
          "30138": "0xe014fe8c4d5c23edb7ac4011f226e869ac7ef5cc",
          "30151": "0xe014fe8c4d5c23edb7ac4011f226e869ac7ef5cc",
          "30154": "0xe014fe8c4d5c23edb7ac4011f226e869ac7ef5cc",
          "30182": "0x8ddf05f9a5c488b4973897e278b58895bf87cb24",
          "30184": "0x8ddf05f9a5c488b4973897e278b58895bf87cb24",
          "30214": "0xe014fe8c4d5c23edb7ac4011f226e869ac7ef5cc",
          "30243": "0x0ff4cc28826356503bb79c00637bec0ee006f237",
          "30255": "0x8ddf05f9a5c488b4973897e278b58895bf87cb24",
          "30260": "0x8ddf05f9a5c488b4973897e278b58895bf87cb24",
          "30290": "0x8ddf05f9a5c488b4973897e278b58895bf87cb24"
    }
  },
  "layerzero-labs": {
    name: "LayerZero Labs",
    jurisdiction: "US",
    infrastructure: "Multi-cloud",
    type: "Core Protocol",
    regulator: "None",
    confidence: "medium",
    securityModel: "undefined",
    description: "Core protocol DVN",
    website: "https://layerzero.network",
    addresses: {
          "30101": "0xdb979d0a36af0525afa60fc265b1525505c55d79",
          "30102": "0xfd6865c841c2d64565562fcc7e05e619a30615f0",
          "30106": "0x962f502a63f5fbeb44dc9ab932122648e8352959",
          "30109": "0xa70c51c38d5a9990f3113a403d74eba01fce4ccb",
          "30110": "0x1308151a7ebac14f435d3ad5ff95c34160d539a5",
          "30111": "0xd4925b81f62457caca368412315d230535b9a48a",
          "30112": "0xe60a3959ca23a92bf5aaf992ef837ca7f828628a",
          "30116": "0xd4925b81f62457caca368412315d230535b9a48a",
          "30118": "0x795f8325af292ff6e58249361d1954893be15aff",
          "30121": "0x8363302080e711e0cab978c081b9e69308d49808",
          "30126": "0x2b3ebe6662ad402317ee7ef4e6b25c79a0f91015",
          "30138": "0x8b9b67b22ab2ed6ee324c2fd43734dbd2dddd045",
          "30145": "0x2d40a7b66f776345cf763c8ebb83199cd285e7a3",
          "30151": "0x32d4f92437454829b3fe7bebfece5d0523deb475",
          "30154": "0x11bb2991882a86dc3e38858d922559a385d506ba",
          "30165": "0x620a9df73d2f1015ea75aea1067227f9013f5c51",
          "30182": "0xc80233ad8251e668becbc3b0415707fc7075501e",
          "30184": "0x9e059a54699a285714207b43b055483e78faac25",
          "30214": "0x755b3b6e6be0747f02ccc0b96001403fc7e8def5",
          "30238": "0x6788f52439aca6bff597d3eec2dc9a44b8fee842",
          "30243": "0xc097ab8cd7b053326dfe9fb3e3a31a0cce3b526f",
          "30255": "0x47fe112e334f5f766db3c44f7c1813468240ede9",
          "30260": "0x9c061c9a4782294eef65ef28cb88233a987f4bdd",
          "30266": "0x28a5536ca9f36c45a9d2ac8d2b62fc46fde024b6",
          "30271": "0x282b3386571f7f794450d5789911a9804fa346b4",
          "30285": "0xce8358bc28dd8296ce8caf1cd2b44787abd65887",
          "30290": "0xcc49e6fca014c77e1eb604351cc1e08c84511760",
          "30367": "0x282b3386571f7f794450d5789911a9804fa346b4",
          "30383": "0x9e059a54699a285714207b43b055483e78faac25"
    }
  },
  "horizen-labs": {
    name: "Horizen",
    jurisdiction: "US",
    infrastructure: "AWS",
    type: "Corporate",
    regulator: "SEC",
    confidence: "medium",
    securityModel: "undefined",
    description: "Zero-knowledge infrastructure provider",
    website: "https://horizenlabs.io",
    addresses: {
          "30101": "0x380275805876ff19055ea900cdb2b46a94ecf20d",
          "30102": "0x247624e2143504730aec22912ed41f092498bef2",
          "30106": "0x07c05eab7716acb6f83ebf6268f8eecda8892ba1",
          "30109": "0x25e0e650a78e6304a3983fc4b7ffc6544b1beea6",
          "30110": "0x5cff49d69d79d677dd3e5b38e048a0dcb6d86aaf",
          "30111": "0xeb64c44109ede90cc6e34953ab122a1f09460a44",
          "30112": "0x25e0e650a78e6304a3983fc4b7ffc6544b1beea6",
          "30116": "0x31f748a368a893bdb5abb67ec95f232507601a73",
          "30118": "0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b",
          "30121": "0x462a63dbe8ca43a57d379c88a382c02862b9a2ce",
          "30126": "0x7fe673201724925b5c477d4e1a4bd3e954688cf5",
          "30138": "0x34730f2570e6cff8b1c91faabf37d0dd917c4367",
          "30145": "0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b",
          "30151": "0x7fe673201724925b5c477d4e1a4bd3e954688cf5",
          "30154": "0x6abdb569dc985504cccb541ade8445e5266e7388",
          "30165": "0x1253e268bc04bb43cb96d2f7ee858b8a1433cf6d",
          "30182": "0xacde1f22eeab249d3ca6ba8805c8fee9f52a16e7",
          "30184": "0xa7b5189bca84cd304d8553977c7c614329750d99",
          "30214": "0xfa9ba83c102283958b997adc8b44ed3a3cdb5dda",
          "30238": "0x54dd79f5ce72b51fcbbcb170dd01e32034323565",
          "30243": "0x70bf42c69173d6e33b834f59630dac592c70b369",
          "30255": "0xacde1f22eeab249d3ca6ba8805c8fee9f52a16e7",
          "30260": "0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b",
          "30266": "0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b",
          "30290": "0x7fe673201724925b5c477d4e1a4bd3e954688cf5"
    }
  },
  "bitgo": {
    name: "BitGo",
    jurisdiction: "US",
    infrastructure: "Self-hosted",
    type: "Custodian",
    regulator: "NYDFS",
    confidence: "high",
    securityModel: "undefined",
    description: "Institutional digital asset custodian",
    website: "https://bitgo.com",
    addresses: {
          "30101": "0xc9ca319f6da263910fd9b037ec3d817a814ef3d8",
          "30102": "0xa2ceb887f545400b8247dfb7e9ccada7ababbde8",
          "30106": "0xc18d69d1a83294d0886e1b79f241405f1fa86cb6",
          "30109": "0x02152f4624596602dcbb8b8ead2988ad44edc865",
          "30110": "0x0711dd777ae626ef5e0a4f50e199c7a0e0666857",
          "30111": "0xf24dc834039a1e39f6b99a51df05df9c91e35b2d",
          "30112": "0x3b247f1b48f055ebf2db593672b98c9597e3081e",
          "30184": "0x133e9fb2d339d8428476a714b1113b024343811e"
    }
  },
  "stargate": {
    name: "Stargate",
    jurisdiction: "Cayman Islands",
    infrastructure: "Unknown",
    type: "DeFi",
    regulator: "CIMA",
    confidence: "low",
    securityModel: "undefined",
    description: "LayerZero ecosystem bridge",
    website: "https://stargate.finance",
    addresses: {
          "30101": "0x8fafae7dd957044088b3d0f67359c327c6200d18",
          "30102": "0xac8de74ce0a44a5e73bbc709fe800406f58431e0",
          "30106": "0x252b234545e154543ad2784c7111eb90406be836",
          "30109": "0xc79f0b1bcb7cdae9f9ba547dcfc57cbfcd2993a5",
          "30110": "0x5756a74e8e18d8392605ba667171962b2b2826b5",
          "30111": "0xfe6507f094155cabb4784403cd784c2df04122dd",
          "30118": "0x9f45834f0c8042e36935781b944443e906886a87",
          "30145": "0x9cbaf815ed62ef45c59e9f2cb05106babb4d31d3",
          "30151": "0x61a1b61a1087be03abedc04900cfcc1c14187237",
          "30154": "0xfcea5cef8b1ae3a454577c9444cdd95c1284b0cf",
          "30165": "0x62aa89bad332788021f6f4f4fb196d5fe59c27a6",
          "30182": "0x17720e3f361dcc2f70871a2ce3ac51b0eaa5c2e4",
          "30184": "0xcdf31d62140204c08853b547e64707110fbc6680",
          "30214": "0xb87591d8b0b93fae8b631a073577c40e8dd46a62",
          "30238": "0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b",
          "30255": "0x06559ee34d85a88317bf0bfe307444116c631b67",
          "30290": "0xfe809470016196573d64a8d17a745bebea4ecc41"
    }
  },
  "p2p": {
    name: "P2P.org",
    jurisdiction: "EU",
    infrastructure: "Self-hosted",
    type: "Staking",
    regulator: "None",
    confidence: "medium",
    securityModel: "undefined",
    description: "Non-custodial staking provider",
    website: "https://p2p.org",
    addresses: {
          "30184": "0x5b6735c66d97479ccd18294fc96b3084ecb2fa3f"
    }
  },
  "canary": {
    name: "Canary",
    jurisdiction: "US",
    infrastructure: "Unknown",
    type: "Auditor",
    regulator: "None",
    confidence: "medium",
    securityModel: "undefined",
    description: "undefined",
    addresses: {
          "30101": "0xa4fe5a5b9a846458a70cd0748228aed3bf65c2cd",
          "30102": "0xfa9ba83c102283958b997adc8b44ed3a3cdb5dda",
          "30106": "0xcc49e6fca014c77e1eb604351cc1e08c84511760",
          "30109": "0x13feb7234ff60a97af04477d6421415766753ba3",
          "30110": "0xf2e380c90e6c09721297526dbc74f870e114dfcb",
          "30111": "0x5b6735c66d97479ccd18294fc96b3084ecb2fa3f",
          "30112": "0xe5bffd46776251b70895517d4ab635a640da61e9",
          "30116": "0x94aafe0a92a8300f0a2100a7f3de47d6845747a9",
          "30118": "0x7a3d18e2324536294cd6f054cdde7c994f40391a",
          "30121": "0xa6f5ddbf0bd4d03334523465439d301080574742",
          "30126": "0x8fa9eef18c2a1459024f0b44714e5acc1ce7f5e8",
          "30138": "0x33e5fcc13d7439cc62d54c41aa966197145b3cd7",
          "30145": "0x06b85533967179ed5bc9c754b84ae7d02f7ed830",
          "30151": "0xaf75bfd402f3d4ee84978179a6c87d16c4bd1724",
          "30154": "0x90ee303d4743f460b9a38415e09f3799b85a4efc",
          "30165": "0x05db3a229293c09f639a16526bb2481704716df0",
          "30182": "0x1154d04d07aee26ff2c200bd373eb76a7e5694d6",
          "30184": "0x554833698ae0fb22ecc90b01222903fd62ca4b47",
          "30214": "0xdf44a1594d3d516f7cdfb4dc275a79a5f6e3db1d",
          "30238": "0xf1042bba248634583d0678d53fb33bc885e09f11",
          "30243": "0x6398e91001cc1682bba103e6b2489fa5675a5a64",
          "30255": "0x5d8aed4182a8ecc47386e88aa8753dde7423996e",
          "30260": "0x047d9dbe4fc6b5c916f37237f547f9f42809935a",
          "30266": "0xa1491ada1168f04df32f72913fc3f27522950acf",
          "30290": "0xa2447e5b58d357c49bf74b50b14421e6a100e525"
    }
  },
  "bcw": {
    name: "BCW Group",
    jurisdiction: "APAC",
    infrastructure: "Unknown",
    type: "VC",
    regulator: "None",
    confidence: "low",
    securityModel: "undefined",
    description: "undefined",
    addresses: {
          "30184": "0xb3ce0a5d132cd9bf965aba435e650c55edce0062",
          "30266": "0x7fe673201724925b5c477d4e1a4bd3e954688cf5"
    }
  },
  "frax": {
    name: "Frax",
    jurisdiction: "US",
    infrastructure: "Unknown",
    type: "DeFi",
    regulator: "None",
    confidence: "medium",
    securityModel: "undefined",
    description: "undefined",
    addresses: {
          "30101": "0x38654142f5e672ae86a1b21523aafc765e6a1e08",
          "30102": "0xd4bf35ce3bfc7f7d7dfc0694a7d4aa8b8c60a38c",
          "30106": "0xfe4c37cd401f58ee0bf4d214447bf306c2bbd41b",
          "30109": "0xdab6e6ecb3513a8d2614ad75199b4b264a731050",
          "30110": "0xb42726e41dbe96fc4ea6d73cd792167608353698",
          "30111": "0x7240264781aa2f97cb994c6231297a8606483242",
          "30165": "0x2eb85384cad49a67ebd8e2afb0f72b3f586baf03",
          "30184": "0x187cf227f81c287303ee765ee001e151347faaa2",
          "30214": "0x93bb6f93fa90a18e88a27bcfbcb048f7e14733c6",
          "30243": "0xfa06f93ad99825114c8f8738943734b07fdd162f",
          "30255": "0x315b0e76a510607bb0f706b17716f426d5b385b8",
          "30260": "0x2ae36a544b904f2f2960f6fd1a6084b4b11ba334"
    }
  },
  "paxos": {
    name: "Paxos",
    jurisdiction: "US",
    infrastructure: "Self-hosted",
    type: "Issuer",
    regulator: "NYDFS",
    confidence: "high",
    securityModel: "undefined",
    description: "undefined",
    addresses: {
          "30101": "0xb0b2ef168f52f6d1e42f461e11117295ef992daf",
          "30110": "0x8e5f5825602bc5db725974bb9e60677d4adc5fbe",
          "30260": "0x8befb8cd9529e539b095251ea3a058e710225d30"
    }
  },
  "curve": {
    name: "Curve",
    jurisdiction: "EU",
    infrastructure: "Unknown",
    type: "DeFi",
    regulator: "None",
    confidence: "medium",
    securityModel: "undefined",
    description: "undefined",
    addresses: {
          "30101": "0xcc35923c43893cc31f2815e216afd7efb60f1fb0",
          "30102": "0xc6e1f0fc326913bd31fb11699c61f6f1f2a5e6d2",
          "30106": "0x6821ea3d3a52421d2b7df330f2316ed157314d7f",
          "30109": "0x4066b6e7bfd761b579902e7e8d03f4feb9b9536e",
          "30110": "0x4066b6e7bfd761b579902e7e8d03f4feb9b9536e",
          "30111": "0xb908fc507fe3145e855cf63127349756b9ecf3a6",
          "30112": "0x06a32efafc7698c00e87f5225178d7364773e93b",
          "30116": "0xc4305b4a16cb631cbd34b33380fb8c221cdf63ab",
          "30138": "0x7decc6df3af9cfc275e25d2f9703ecf7ad800d5d",
          "30145": "0x05df4949f0b4dc4c4b1adc0e01700bc669e935c3",
          "30154": "0x30c673a1f34b91c4bf4951670a2b7c8c0663b100",
          "30184": "0x1a3a8421e48b7536f3f71d8b14a1449c90efa909",
          "30260": "0x1a92c25cb7cd80e1138e8125fc0a0b0642688c0b",
          "30290": "0xf18f2c3d86ec9a350d5e10cb67c614201f210d3d"
    }
  },
  "usdt0": {
    name: "Tether",
    jurisdiction: "APAC",
    infrastructure: "Unknown",
    type: "Issuer",
    regulator: "None",
    confidence: "medium",
    securityModel: "undefined",
    description: "undefined",
    addresses: {
          "30260": "0x6de0d56e2d695db9e2b4fbeca3d81372c59848bb"
    }
  },
};


export function getDVNMetadata(address, chainId) {
  const addr = address?.toLowerCase();
  for (const [key, dvn] of Object.entries(DVN_REGISTRY)) {
    const chainAddr = dvn.addresses[chainId]?.toLowerCase();
    if (chainAddr === addr) {
      return { id: key, ...dvn };
    }
  }
  return {
    id: null,
    name: "Unknown DVN",
    jurisdiction: "Unknown",
    infrastructure: "Unknown",
    type: "Unknown",
    regulator: "None",
    confidence: "low"
  };
}

export function getDVNName(address, chainId) {
  const meta = getDVNMetadata(address, chainId);
  return meta.name;
}

export function getDVNAddresses(dvnName) {
  const normalized = dvnName.toLowerCase().trim();
  for (const [key, dvn] of Object.entries(DVN_REGISTRY)) {
    if (dvn.name.toLowerCase().includes(normalized) || key === normalized) {
      return { name: dvn.name, addresses: dvn.addresses };
    }
  }
  return null;
}

export const CHAIN_INFO = {
  30101: { name: "Ethereum", explorer: "https://api.etherscan.io/api", chainId: 1, nativeToken: "ETH", coingeckoId: "ethereum" },
  30102: { name: "BNB Chain", explorer: "https://api.bscscan.com/api", chainId: 56, nativeToken: "BNB", coingeckoId: "binancecoin" },
  30106: { name: "Avalanche", explorer: "https://api.snowtrace.io/api", chainId: 43114, nativeToken: "AVAX", coingeckoId: "avalanche-2" },
  30109: { name: "Polygon", explorer: "https://api.polygonscan.com/api", chainId: 137, nativeToken: "POL", coingeckoId: "matic-network" },
  30110: { name: "Arbitrum", explorer: "https://api.arbiscan.io/api", chainId: 42161, nativeToken: "ETH", coingeckoId: "ethereum" },
  30111: { name: "Optimism", explorer: "https://api-optimistic.etherscan.io/api", chainId: 10, nativeToken: "ETH", coingeckoId: "ethereum" },
  30112: { name: "Fantom", explorer: "https://api.ftmscan.com/api", chainId: 250, nativeToken: "FTM", coingeckoId: "fantom" },
  30184: { name: "Base", explorer: "https://api.basescan.org/api", chainId: 8453, nativeToken: "ETH", coingeckoId: "ethereum" },
  30183: { name: "Linea", explorer: "https://api.lineascan.build/api", chainId: 59144, nativeToken: "ETH", coingeckoId: "ethereum" },
  30214: { name: "Scroll", explorer: "https://api.scrollscan.com/api", chainId: 534352, nativeToken: "ETH", coingeckoId: "ethereum" },
  30165: { name: "zkSync", explorer: "https://api-era.zksync.network/api", chainId: 324, nativeToken: "ETH", coingeckoId: "ethereum", useBlockscout: true },
  30260: { name: "X Layer", explorer: "https://www.oklink.com/api/v5/explorer/blockchain", chainId: 196, nativeToken: "OKB", useBlockscout: true },
  30266: { name: "Tenet", explorer: "https://tenetscan.io/api", chainId: 1559, nativeToken: "TENET", useBlockscout: true },
  30290: { name: "Mantle", explorer: "https://api.mantlescan.xyz/api", chainId: 5000, nativeToken: "MNT" },
  30243: { name: "Blast", explorer: "https://api.blastscan.io/api", chainId: 81457, nativeToken: "ETH", coingeckoId: "ethereum" }
};
