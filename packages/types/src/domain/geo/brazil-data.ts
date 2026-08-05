export interface BrazilState {
	code: string;
	name: string;
	ibgeId: number;
}

export interface BrazilCity {
	id: number;
	name: string;
	stateCode: string;
}

export const brazilStates = [
	{
		"code": "AC",
		"name": "Acre",
		"ibgeId": 12
	},
	{
		"code": "AL",
		"name": "Alagoas",
		"ibgeId": 27
	},
	{
		"code": "AP",
		"name": "Amapá",
		"ibgeId": 16
	},
	{
		"code": "AM",
		"name": "Amazonas",
		"ibgeId": 13
	},
	{
		"code": "BA",
		"name": "Bahia",
		"ibgeId": 29
	},
	{
		"code": "CE",
		"name": "Ceará",
		"ibgeId": 23
	},
	{
		"code": "DF",
		"name": "Distrito Federal",
		"ibgeId": 53
	},
	{
		"code": "ES",
		"name": "Espírito Santo",
		"ibgeId": 32
	},
	{
		"code": "GO",
		"name": "Goiás",
		"ibgeId": 52
	},
	{
		"code": "MA",
		"name": "Maranhão",
		"ibgeId": 21
	},
	{
		"code": "MT",
		"name": "Mato Grosso",
		"ibgeId": 51
	},
	{
		"code": "MS",
		"name": "Mato Grosso do Sul",
		"ibgeId": 50
	},
	{
		"code": "MG",
		"name": "Minas Gerais",
		"ibgeId": 31
	},
	{
		"code": "PA",
		"name": "Pará",
		"ibgeId": 15
	},
	{
		"code": "PB",
		"name": "Paraíba",
		"ibgeId": 25
	},
	{
		"code": "PR",
		"name": "Paraná",
		"ibgeId": 41
	},
	{
		"code": "PE",
		"name": "Pernambuco",
		"ibgeId": 26
	},
	{
		"code": "PI",
		"name": "Piauí",
		"ibgeId": 22
	},
	{
		"code": "RJ",
		"name": "Rio de Janeiro",
		"ibgeId": 33
	},
	{
		"code": "RN",
		"name": "Rio Grande do Norte",
		"ibgeId": 24
	},
	{
		"code": "RS",
		"name": "Rio Grande do Sul",
		"ibgeId": 43
	},
	{
		"code": "RO",
		"name": "Rondônia",
		"ibgeId": 11
	},
	{
		"code": "RR",
		"name": "Roraima",
		"ibgeId": 14
	},
	{
		"code": "SC",
		"name": "Santa Catarina",
		"ibgeId": 42
	},
	{
		"code": "SP",
		"name": "São Paulo",
		"ibgeId": 35
	},
	{
		"code": "SE",
		"name": "Sergipe",
		"ibgeId": 28
	},
	{
		"code": "TO",
		"name": "Tocantins",
		"ibgeId": 17
	}
] satisfies BrazilState[];

export const brazilCities = [
	{
		"id": 1200013,
		"name": "Acrelândia",
		"stateCode": "AC"
	},
	{
		"id": 1200054,
		"name": "Assis Brasil",
		"stateCode": "AC"
	},
	{
		"id": 1200104,
		"name": "Brasiléia",
		"stateCode": "AC"
	},
	{
		"id": 1200138,
		"name": "Bujari",
		"stateCode": "AC"
	},
	{
		"id": 1200179,
		"name": "Capixaba",
		"stateCode": "AC"
	},
	{
		"id": 1200203,
		"name": "Cruzeiro do Sul",
		"stateCode": "AC"
	},
	{
		"id": 1200252,
		"name": "Epitaciolândia",
		"stateCode": "AC"
	},
	{
		"id": 1200302,
		"name": "Feijó",
		"stateCode": "AC"
	},
	{
		"id": 1200328,
		"name": "Jordão",
		"stateCode": "AC"
	},
	{
		"id": 1200336,
		"name": "Mâncio Lima",
		"stateCode": "AC"
	},
	{
		"id": 1200344,
		"name": "Manoel Urbano",
		"stateCode": "AC"
	},
	{
		"id": 1200351,
		"name": "Marechal Thaumaturgo",
		"stateCode": "AC"
	},
	{
		"id": 1200385,
		"name": "Plácido de Castro",
		"stateCode": "AC"
	},
	{
		"id": 1200807,
		"name": "Porto Acre",
		"stateCode": "AC"
	},
	{
		"id": 1200393,
		"name": "Porto Walter",
		"stateCode": "AC"
	},
	{
		"id": 1200401,
		"name": "Rio Branco",
		"stateCode": "AC"
	},
	{
		"id": 1200427,
		"name": "Rodrigues Alves",
		"stateCode": "AC"
	},
	{
		"id": 1200435,
		"name": "Santa Rosa do Purus",
		"stateCode": "AC"
	},
	{
		"id": 1200500,
		"name": "Sena Madureira",
		"stateCode": "AC"
	},
	{
		"id": 1200450,
		"name": "Senador Guiomard",
		"stateCode": "AC"
	},
	{
		"id": 1200609,
		"name": "Tarauacá",
		"stateCode": "AC"
	},
	{
		"id": 1200708,
		"name": "Xapuri",
		"stateCode": "AC"
	},
	{
		"id": 2700102,
		"name": "Água Branca",
		"stateCode": "AL"
	},
	{
		"id": 2700201,
		"name": "Anadia",
		"stateCode": "AL"
	},
	{
		"id": 2700300,
		"name": "Arapiraca",
		"stateCode": "AL"
	},
	{
		"id": 2700409,
		"name": "Atalaia",
		"stateCode": "AL"
	},
	{
		"id": 2700508,
		"name": "Barra de Santo Antônio",
		"stateCode": "AL"
	},
	{
		"id": 2700607,
		"name": "Barra de São Miguel",
		"stateCode": "AL"
	},
	{
		"id": 2700706,
		"name": "Batalha",
		"stateCode": "AL"
	},
	{
		"id": 2700805,
		"name": "Belém",
		"stateCode": "AL"
	},
	{
		"id": 2700904,
		"name": "Belo Monte",
		"stateCode": "AL"
	},
	{
		"id": 2701001,
		"name": "Boca da Mata",
		"stateCode": "AL"
	},
	{
		"id": 2701100,
		"name": "Branquinha",
		"stateCode": "AL"
	},
	{
		"id": 2701209,
		"name": "Cacimbinhas",
		"stateCode": "AL"
	},
	{
		"id": 2701308,
		"name": "Cajueiro",
		"stateCode": "AL"
	},
	{
		"id": 2701357,
		"name": "Campestre",
		"stateCode": "AL"
	},
	{
		"id": 2701407,
		"name": "Campo Alegre",
		"stateCode": "AL"
	},
	{
		"id": 2701506,
		"name": "Campo Grande",
		"stateCode": "AL"
	},
	{
		"id": 2701605,
		"name": "Canapi",
		"stateCode": "AL"
	},
	{
		"id": 2701704,
		"name": "Capela",
		"stateCode": "AL"
	},
	{
		"id": 2701803,
		"name": "Carneiros",
		"stateCode": "AL"
	},
	{
		"id": 2701902,
		"name": "Chã Preta",
		"stateCode": "AL"
	},
	{
		"id": 2702009,
		"name": "Coité do Nóia",
		"stateCode": "AL"
	},
	{
		"id": 2702108,
		"name": "Colônia Leopoldina",
		"stateCode": "AL"
	},
	{
		"id": 2702207,
		"name": "Coqueiro Seco",
		"stateCode": "AL"
	},
	{
		"id": 2702306,
		"name": "Coruripe",
		"stateCode": "AL"
	},
	{
		"id": 2702355,
		"name": "Craíbas",
		"stateCode": "AL"
	},
	{
		"id": 2702405,
		"name": "Delmiro Gouveia",
		"stateCode": "AL"
	},
	{
		"id": 2702504,
		"name": "Dois Riachos",
		"stateCode": "AL"
	},
	{
		"id": 2702553,
		"name": "Estrela de Alagoas",
		"stateCode": "AL"
	},
	{
		"id": 2702603,
		"name": "Feira Grande",
		"stateCode": "AL"
	},
	{
		"id": 2702702,
		"name": "Feliz Deserto",
		"stateCode": "AL"
	},
	{
		"id": 2702801,
		"name": "Flexeiras",
		"stateCode": "AL"
	},
	{
		"id": 2702900,
		"name": "Girau do Ponciano",
		"stateCode": "AL"
	},
	{
		"id": 2703007,
		"name": "Ibateguara",
		"stateCode": "AL"
	},
	{
		"id": 2703106,
		"name": "Igaci",
		"stateCode": "AL"
	},
	{
		"id": 2703205,
		"name": "Igreja Nova",
		"stateCode": "AL"
	},
	{
		"id": 2703304,
		"name": "Inhapi",
		"stateCode": "AL"
	},
	{
		"id": 2703403,
		"name": "Jacaré dos Homens",
		"stateCode": "AL"
	},
	{
		"id": 2703502,
		"name": "Jacuípe",
		"stateCode": "AL"
	},
	{
		"id": 2703601,
		"name": "Japaratinga",
		"stateCode": "AL"
	},
	{
		"id": 2703700,
		"name": "Jaramataia",
		"stateCode": "AL"
	},
	{
		"id": 2703759,
		"name": "Jequiá da Praia",
		"stateCode": "AL"
	},
	{
		"id": 2703809,
		"name": "Joaquim Gomes",
		"stateCode": "AL"
	},
	{
		"id": 2703908,
		"name": "Jundiá",
		"stateCode": "AL"
	},
	{
		"id": 2704005,
		"name": "Junqueiro",
		"stateCode": "AL"
	},
	{
		"id": 2704104,
		"name": "Lagoa da Canoa",
		"stateCode": "AL"
	},
	{
		"id": 2704203,
		"name": "Limoeiro de Anadia",
		"stateCode": "AL"
	},
	{
		"id": 2704302,
		"name": "Maceió",
		"stateCode": "AL"
	},
	{
		"id": 2704401,
		"name": "Major Isidoro",
		"stateCode": "AL"
	},
	{
		"id": 2704906,
		"name": "Mar Vermelho",
		"stateCode": "AL"
	},
	{
		"id": 2704500,
		"name": "Maragogi",
		"stateCode": "AL"
	},
	{
		"id": 2704609,
		"name": "Maravilha",
		"stateCode": "AL"
	},
	{
		"id": 2704708,
		"name": "Marechal Deodoro",
		"stateCode": "AL"
	},
	{
		"id": 2704807,
		"name": "Maribondo",
		"stateCode": "AL"
	},
	{
		"id": 2705002,
		"name": "Mata Grande",
		"stateCode": "AL"
	},
	{
		"id": 2705101,
		"name": "Matriz de Camaragibe",
		"stateCode": "AL"
	},
	{
		"id": 2705200,
		"name": "Messias",
		"stateCode": "AL"
	},
	{
		"id": 2705309,
		"name": "Minador do Negrão",
		"stateCode": "AL"
	},
	{
		"id": 2705408,
		"name": "Monteirópolis",
		"stateCode": "AL"
	},
	{
		"id": 2705507,
		"name": "Murici",
		"stateCode": "AL"
	},
	{
		"id": 2705606,
		"name": "Novo Lino",
		"stateCode": "AL"
	},
	{
		"id": 2705705,
		"name": "Olho d'Água das Flores",
		"stateCode": "AL"
	},
	{
		"id": 2705804,
		"name": "Olho d'Água do Casado",
		"stateCode": "AL"
	},
	{
		"id": 2705903,
		"name": "Olho d'Água Grande",
		"stateCode": "AL"
	},
	{
		"id": 2706000,
		"name": "Olivença",
		"stateCode": "AL"
	},
	{
		"id": 2706109,
		"name": "Ouro Branco",
		"stateCode": "AL"
	},
	{
		"id": 2706208,
		"name": "Palestina",
		"stateCode": "AL"
	},
	{
		"id": 2706307,
		"name": "Palmeira dos Índios",
		"stateCode": "AL"
	},
	{
		"id": 2706406,
		"name": "Pão de Açúcar",
		"stateCode": "AL"
	},
	{
		"id": 2706422,
		"name": "Pariconha",
		"stateCode": "AL"
	},
	{
		"id": 2706448,
		"name": "Paripueira",
		"stateCode": "AL"
	},
	{
		"id": 2706505,
		"name": "Passo de Camaragibe",
		"stateCode": "AL"
	},
	{
		"id": 2706604,
		"name": "Paulo Jacinto",
		"stateCode": "AL"
	},
	{
		"id": 2706703,
		"name": "Penedo",
		"stateCode": "AL"
	},
	{
		"id": 2706802,
		"name": "Piaçabuçu",
		"stateCode": "AL"
	},
	{
		"id": 2706901,
		"name": "Pilar",
		"stateCode": "AL"
	},
	{
		"id": 2707008,
		"name": "Pindoba",
		"stateCode": "AL"
	},
	{
		"id": 2707107,
		"name": "Piranhas",
		"stateCode": "AL"
	},
	{
		"id": 2707206,
		"name": "Poço das Trincheiras",
		"stateCode": "AL"
	},
	{
		"id": 2707305,
		"name": "Porto Calvo",
		"stateCode": "AL"
	},
	{
		"id": 2707404,
		"name": "Porto de Pedras",
		"stateCode": "AL"
	},
	{
		"id": 2707503,
		"name": "Porto Real do Colégio",
		"stateCode": "AL"
	},
	{
		"id": 2707602,
		"name": "Quebrangulo",
		"stateCode": "AL"
	},
	{
		"id": 2707701,
		"name": "Rio Largo",
		"stateCode": "AL"
	},
	{
		"id": 2707800,
		"name": "Roteiro",
		"stateCode": "AL"
	},
	{
		"id": 2707909,
		"name": "Santa Luzia do Norte",
		"stateCode": "AL"
	},
	{
		"id": 2708006,
		"name": "Santana do Ipanema",
		"stateCode": "AL"
	},
	{
		"id": 2708105,
		"name": "Santana do Mundaú",
		"stateCode": "AL"
	},
	{
		"id": 2708204,
		"name": "São Brás",
		"stateCode": "AL"
	},
	{
		"id": 2708303,
		"name": "São José da Laje",
		"stateCode": "AL"
	},
	{
		"id": 2708402,
		"name": "São José da Tapera",
		"stateCode": "AL"
	},
	{
		"id": 2708501,
		"name": "São Luís do Quitunde",
		"stateCode": "AL"
	},
	{
		"id": 2708600,
		"name": "São Miguel dos Campos",
		"stateCode": "AL"
	},
	{
		"id": 2708709,
		"name": "São Miguel dos Milagres",
		"stateCode": "AL"
	},
	{
		"id": 2708808,
		"name": "São Sebastião",
		"stateCode": "AL"
	},
	{
		"id": 2708907,
		"name": "Satuba",
		"stateCode": "AL"
	},
	{
		"id": 2708956,
		"name": "Senador Rui Palmeira",
		"stateCode": "AL"
	},
	{
		"id": 2709004,
		"name": "Tanque d'Arca",
		"stateCode": "AL"
	},
	{
		"id": 2709103,
		"name": "Taquarana",
		"stateCode": "AL"
	},
	{
		"id": 2709152,
		"name": "Teotônio Vilela",
		"stateCode": "AL"
	},
	{
		"id": 2709202,
		"name": "Traipu",
		"stateCode": "AL"
	},
	{
		"id": 2709301,
		"name": "União dos Palmares",
		"stateCode": "AL"
	},
	{
		"id": 2709400,
		"name": "Viçosa",
		"stateCode": "AL"
	},
	{
		"id": 1300029,
		"name": "Alvarães",
		"stateCode": "AM"
	},
	{
		"id": 1300060,
		"name": "Amaturá",
		"stateCode": "AM"
	},
	{
		"id": 1300086,
		"name": "Anamã",
		"stateCode": "AM"
	},
	{
		"id": 1300102,
		"name": "Anori",
		"stateCode": "AM"
	},
	{
		"id": 1300144,
		"name": "Apuí",
		"stateCode": "AM"
	},
	{
		"id": 1300201,
		"name": "Atalaia do Norte",
		"stateCode": "AM"
	},
	{
		"id": 1300300,
		"name": "Autazes",
		"stateCode": "AM"
	},
	{
		"id": 1300409,
		"name": "Barcelos",
		"stateCode": "AM"
	},
	{
		"id": 1300508,
		"name": "Barreirinha",
		"stateCode": "AM"
	},
	{
		"id": 1300607,
		"name": "Benjamin Constant",
		"stateCode": "AM"
	},
	{
		"id": 1300631,
		"name": "Beruri",
		"stateCode": "AM"
	},
	{
		"id": 1300680,
		"name": "Boa Vista do Ramos",
		"stateCode": "AM"
	},
	{
		"id": 1300706,
		"name": "Boca do Acre",
		"stateCode": "AM"
	},
	{
		"id": 1300805,
		"name": "Borba",
		"stateCode": "AM"
	},
	{
		"id": 1300839,
		"name": "Caapiranga",
		"stateCode": "AM"
	},
	{
		"id": 1300904,
		"name": "Canutama",
		"stateCode": "AM"
	},
	{
		"id": 1301001,
		"name": "Carauari",
		"stateCode": "AM"
	},
	{
		"id": 1301100,
		"name": "Careiro",
		"stateCode": "AM"
	},
	{
		"id": 1301159,
		"name": "Careiro da Várzea",
		"stateCode": "AM"
	},
	{
		"id": 1301209,
		"name": "Coari",
		"stateCode": "AM"
	},
	{
		"id": 1301308,
		"name": "Codajás",
		"stateCode": "AM"
	},
	{
		"id": 1301407,
		"name": "Eirunepé",
		"stateCode": "AM"
	},
	{
		"id": 1301506,
		"name": "Envira",
		"stateCode": "AM"
	},
	{
		"id": 1301605,
		"name": "Fonte Boa",
		"stateCode": "AM"
	},
	{
		"id": 1301654,
		"name": "Guajará",
		"stateCode": "AM"
	},
	{
		"id": 1301704,
		"name": "Humaitá",
		"stateCode": "AM"
	},
	{
		"id": 1301803,
		"name": "Ipixuna",
		"stateCode": "AM"
	},
	{
		"id": 1301852,
		"name": "Iranduba",
		"stateCode": "AM"
	},
	{
		"id": 1301902,
		"name": "Itacoatiara",
		"stateCode": "AM"
	},
	{
		"id": 1301951,
		"name": "Itamarati",
		"stateCode": "AM"
	},
	{
		"id": 1302009,
		"name": "Itapiranga",
		"stateCode": "AM"
	},
	{
		"id": 1302108,
		"name": "Japurá",
		"stateCode": "AM"
	},
	{
		"id": 1302207,
		"name": "Juruá",
		"stateCode": "AM"
	},
	{
		"id": 1302306,
		"name": "Jutaí",
		"stateCode": "AM"
	},
	{
		"id": 1302405,
		"name": "Lábrea",
		"stateCode": "AM"
	},
	{
		"id": 1302504,
		"name": "Manacapuru",
		"stateCode": "AM"
	},
	{
		"id": 1302553,
		"name": "Manaquiri",
		"stateCode": "AM"
	},
	{
		"id": 1302603,
		"name": "Manaus",
		"stateCode": "AM"
	},
	{
		"id": 1302702,
		"name": "Manicoré",
		"stateCode": "AM"
	},
	{
		"id": 1302801,
		"name": "Maraã",
		"stateCode": "AM"
	},
	{
		"id": 1302900,
		"name": "Maués",
		"stateCode": "AM"
	},
	{
		"id": 1303007,
		"name": "Nhamundá",
		"stateCode": "AM"
	},
	{
		"id": 1303106,
		"name": "Nova Olinda do Norte",
		"stateCode": "AM"
	},
	{
		"id": 1303205,
		"name": "Novo Airão",
		"stateCode": "AM"
	},
	{
		"id": 1303304,
		"name": "Novo Aripuanã",
		"stateCode": "AM"
	},
	{
		"id": 1303403,
		"name": "Parintins",
		"stateCode": "AM"
	},
	{
		"id": 1303502,
		"name": "Pauini",
		"stateCode": "AM"
	},
	{
		"id": 1303536,
		"name": "Presidente Figueiredo",
		"stateCode": "AM"
	},
	{
		"id": 1303569,
		"name": "Rio Preto da Eva",
		"stateCode": "AM"
	},
	{
		"id": 1303601,
		"name": "Santa Isabel do Rio Negro",
		"stateCode": "AM"
	},
	{
		"id": 1303700,
		"name": "Santo Antônio do Içá",
		"stateCode": "AM"
	},
	{
		"id": 1303809,
		"name": "São Gabriel da Cachoeira",
		"stateCode": "AM"
	},
	{
		"id": 1303908,
		"name": "São Paulo de Olivença",
		"stateCode": "AM"
	},
	{
		"id": 1303957,
		"name": "São Sebastião do Uatumã",
		"stateCode": "AM"
	},
	{
		"id": 1304005,
		"name": "Silves",
		"stateCode": "AM"
	},
	{
		"id": 1304062,
		"name": "Tabatinga",
		"stateCode": "AM"
	},
	{
		"id": 1304104,
		"name": "Tapauá",
		"stateCode": "AM"
	},
	{
		"id": 1304203,
		"name": "Tefé",
		"stateCode": "AM"
	},
	{
		"id": 1304237,
		"name": "Tonantins",
		"stateCode": "AM"
	},
	{
		"id": 1304260,
		"name": "Uarini",
		"stateCode": "AM"
	},
	{
		"id": 1304302,
		"name": "Urucará",
		"stateCode": "AM"
	},
	{
		"id": 1304401,
		"name": "Urucurituba",
		"stateCode": "AM"
	},
	{
		"id": 1600105,
		"name": "Amapá",
		"stateCode": "AP"
	},
	{
		"id": 1600204,
		"name": "Calçoene",
		"stateCode": "AP"
	},
	{
		"id": 1600212,
		"name": "Cutias",
		"stateCode": "AP"
	},
	{
		"id": 1600238,
		"name": "Ferreira Gomes",
		"stateCode": "AP"
	},
	{
		"id": 1600253,
		"name": "Itaubal",
		"stateCode": "AP"
	},
	{
		"id": 1600279,
		"name": "Laranjal do Jari",
		"stateCode": "AP"
	},
	{
		"id": 1600303,
		"name": "Macapá",
		"stateCode": "AP"
	},
	{
		"id": 1600402,
		"name": "Mazagão",
		"stateCode": "AP"
	},
	{
		"id": 1600501,
		"name": "Oiapoque",
		"stateCode": "AP"
	},
	{
		"id": 1600154,
		"name": "Pedra Branca do Amapari",
		"stateCode": "AP"
	},
	{
		"id": 1600535,
		"name": "Porto Grande",
		"stateCode": "AP"
	},
	{
		"id": 1600550,
		"name": "Pracuúba",
		"stateCode": "AP"
	},
	{
		"id": 1600600,
		"name": "Santana",
		"stateCode": "AP"
	},
	{
		"id": 1600055,
		"name": "Serra do Navio",
		"stateCode": "AP"
	},
	{
		"id": 1600709,
		"name": "Tartarugalzinho",
		"stateCode": "AP"
	},
	{
		"id": 1600808,
		"name": "Vitória do Jari",
		"stateCode": "AP"
	},
	{
		"id": 2900108,
		"name": "Abaíra",
		"stateCode": "BA"
	},
	{
		"id": 2900207,
		"name": "Abaré",
		"stateCode": "BA"
	},
	{
		"id": 2900306,
		"name": "Acajutiba",
		"stateCode": "BA"
	},
	{
		"id": 2900355,
		"name": "Adustina",
		"stateCode": "BA"
	},
	{
		"id": 2900405,
		"name": "Água Fria",
		"stateCode": "BA"
	},
	{
		"id": 2900603,
		"name": "Aiquara",
		"stateCode": "BA"
	},
	{
		"id": 2900702,
		"name": "Alagoinhas",
		"stateCode": "BA"
	},
	{
		"id": 2900801,
		"name": "Alcobaça",
		"stateCode": "BA"
	},
	{
		"id": 2900900,
		"name": "Almadina",
		"stateCode": "BA"
	},
	{
		"id": 2901007,
		"name": "Amargosa",
		"stateCode": "BA"
	},
	{
		"id": 2901106,
		"name": "Amélia Rodrigues",
		"stateCode": "BA"
	},
	{
		"id": 2901155,
		"name": "América Dourada",
		"stateCode": "BA"
	},
	{
		"id": 2901205,
		"name": "Anagé",
		"stateCode": "BA"
	},
	{
		"id": 2901304,
		"name": "Andaraí",
		"stateCode": "BA"
	},
	{
		"id": 2901353,
		"name": "Andorinha",
		"stateCode": "BA"
	},
	{
		"id": 2901403,
		"name": "Angical",
		"stateCode": "BA"
	},
	{
		"id": 2901502,
		"name": "Anguera",
		"stateCode": "BA"
	},
	{
		"id": 2901601,
		"name": "Antas",
		"stateCode": "BA"
	},
	{
		"id": 2901700,
		"name": "Antônio Cardoso",
		"stateCode": "BA"
	},
	{
		"id": 2901809,
		"name": "Antônio Gonçalves",
		"stateCode": "BA"
	},
	{
		"id": 2901908,
		"name": "Aporá",
		"stateCode": "BA"
	},
	{
		"id": 2901957,
		"name": "Apuarema",
		"stateCode": "BA"
	},
	{
		"id": 2902054,
		"name": "Araçás",
		"stateCode": "BA"
	},
	{
		"id": 2902005,
		"name": "Aracatu",
		"stateCode": "BA"
	},
	{
		"id": 2902104,
		"name": "Araci",
		"stateCode": "BA"
	},
	{
		"id": 2902203,
		"name": "Aramari",
		"stateCode": "BA"
	},
	{
		"id": 2902252,
		"name": "Arataca",
		"stateCode": "BA"
	},
	{
		"id": 2902302,
		"name": "Aratuípe",
		"stateCode": "BA"
	},
	{
		"id": 2902401,
		"name": "Aurelino Leal",
		"stateCode": "BA"
	},
	{
		"id": 2902500,
		"name": "Baianópolis",
		"stateCode": "BA"
	},
	{
		"id": 2902609,
		"name": "Baixa Grande",
		"stateCode": "BA"
	},
	{
		"id": 2902658,
		"name": "Banzaê",
		"stateCode": "BA"
	},
	{
		"id": 2902708,
		"name": "Barra",
		"stateCode": "BA"
	},
	{
		"id": 2902807,
		"name": "Barra da Estiva",
		"stateCode": "BA"
	},
	{
		"id": 2902906,
		"name": "Barra do Choça",
		"stateCode": "BA"
	},
	{
		"id": 2903003,
		"name": "Barra do Mendes",
		"stateCode": "BA"
	},
	{
		"id": 2903102,
		"name": "Barra do Rocha",
		"stateCode": "BA"
	},
	{
		"id": 2903201,
		"name": "Barreiras",
		"stateCode": "BA"
	},
	{
		"id": 2903235,
		"name": "Barro Alto",
		"stateCode": "BA"
	},
	{
		"id": 2903300,
		"name": "Barro Preto",
		"stateCode": "BA"
	},
	{
		"id": 2903276,
		"name": "Barrocas",
		"stateCode": "BA"
	},
	{
		"id": 2903409,
		"name": "Belmonte",
		"stateCode": "BA"
	},
	{
		"id": 2903508,
		"name": "Belo Campo",
		"stateCode": "BA"
	},
	{
		"id": 2903607,
		"name": "Biritinga",
		"stateCode": "BA"
	},
	{
		"id": 2903706,
		"name": "Boa Nova",
		"stateCode": "BA"
	},
	{
		"id": 2903805,
		"name": "Boa Vista do Tupim",
		"stateCode": "BA"
	},
	{
		"id": 2903904,
		"name": "Bom Jesus da Lapa",
		"stateCode": "BA"
	},
	{
		"id": 2903953,
		"name": "Bom Jesus da Serra",
		"stateCode": "BA"
	},
	{
		"id": 2904001,
		"name": "Boninal",
		"stateCode": "BA"
	},
	{
		"id": 2904050,
		"name": "Bonito",
		"stateCode": "BA"
	},
	{
		"id": 2904100,
		"name": "Boquira",
		"stateCode": "BA"
	},
	{
		"id": 2904209,
		"name": "Botuporã",
		"stateCode": "BA"
	},
	{
		"id": 2904308,
		"name": "Brejões",
		"stateCode": "BA"
	},
	{
		"id": 2904407,
		"name": "Brejolândia",
		"stateCode": "BA"
	},
	{
		"id": 2904506,
		"name": "Brotas de Macaúbas",
		"stateCode": "BA"
	},
	{
		"id": 2904605,
		"name": "Brumado",
		"stateCode": "BA"
	},
	{
		"id": 2904704,
		"name": "Buerarema",
		"stateCode": "BA"
	},
	{
		"id": 2904753,
		"name": "Buritirama",
		"stateCode": "BA"
	},
	{
		"id": 2904803,
		"name": "Caatiba",
		"stateCode": "BA"
	},
	{
		"id": 2904852,
		"name": "Cabaceiras do Paraguaçu",
		"stateCode": "BA"
	},
	{
		"id": 2904902,
		"name": "Cachoeira",
		"stateCode": "BA"
	},
	{
		"id": 2905008,
		"name": "Caculé",
		"stateCode": "BA"
	},
	{
		"id": 2905107,
		"name": "Caém",
		"stateCode": "BA"
	},
	{
		"id": 2905156,
		"name": "Caetanos",
		"stateCode": "BA"
	},
	{
		"id": 2905206,
		"name": "Caetité",
		"stateCode": "BA"
	},
	{
		"id": 2905305,
		"name": "Cafarnaum",
		"stateCode": "BA"
	},
	{
		"id": 2905404,
		"name": "Cairu",
		"stateCode": "BA"
	},
	{
		"id": 2905503,
		"name": "Caldeirão Grande",
		"stateCode": "BA"
	},
	{
		"id": 2905602,
		"name": "Camacan",
		"stateCode": "BA"
	},
	{
		"id": 2905701,
		"name": "Camaçari",
		"stateCode": "BA"
	},
	{
		"id": 2905800,
		"name": "Camamu",
		"stateCode": "BA"
	},
	{
		"id": 2905909,
		"name": "Campo Alegre de Lourdes",
		"stateCode": "BA"
	},
	{
		"id": 2906006,
		"name": "Campo Formoso",
		"stateCode": "BA"
	},
	{
		"id": 2906105,
		"name": "Canápolis",
		"stateCode": "BA"
	},
	{
		"id": 2906204,
		"name": "Canarana",
		"stateCode": "BA"
	},
	{
		"id": 2906303,
		"name": "Canavieiras",
		"stateCode": "BA"
	},
	{
		"id": 2906402,
		"name": "Candeal",
		"stateCode": "BA"
	},
	{
		"id": 2906501,
		"name": "Candeias",
		"stateCode": "BA"
	},
	{
		"id": 2906600,
		"name": "Candiba",
		"stateCode": "BA"
	},
	{
		"id": 2906709,
		"name": "Cândido Sales",
		"stateCode": "BA"
	},
	{
		"id": 2906808,
		"name": "Cansanção",
		"stateCode": "BA"
	},
	{
		"id": 2906824,
		"name": "Canudos",
		"stateCode": "BA"
	},
	{
		"id": 2906857,
		"name": "Capela do Alto Alegre",
		"stateCode": "BA"
	},
	{
		"id": 2906873,
		"name": "Capim Grosso",
		"stateCode": "BA"
	},
	{
		"id": 2906899,
		"name": "Caraíbas",
		"stateCode": "BA"
	},
	{
		"id": 2906907,
		"name": "Caravelas",
		"stateCode": "BA"
	},
	{
		"id": 2907004,
		"name": "Cardeal da Silva",
		"stateCode": "BA"
	},
	{
		"id": 2907103,
		"name": "Carinhanha",
		"stateCode": "BA"
	},
	{
		"id": 2907202,
		"name": "Casa Nova",
		"stateCode": "BA"
	},
	{
		"id": 2907301,
		"name": "Castro Alves",
		"stateCode": "BA"
	},
	{
		"id": 2907400,
		"name": "Catolândia",
		"stateCode": "BA"
	},
	{
		"id": 2907509,
		"name": "Catu",
		"stateCode": "BA"
	},
	{
		"id": 2907558,
		"name": "Caturama",
		"stateCode": "BA"
	},
	{
		"id": 2907608,
		"name": "Central",
		"stateCode": "BA"
	},
	{
		"id": 2907707,
		"name": "Chorrochó",
		"stateCode": "BA"
	},
	{
		"id": 2907806,
		"name": "Cícero Dantas",
		"stateCode": "BA"
	},
	{
		"id": 2907905,
		"name": "Cipó",
		"stateCode": "BA"
	},
	{
		"id": 2908002,
		"name": "Coaraci",
		"stateCode": "BA"
	},
	{
		"id": 2908101,
		"name": "Cocos",
		"stateCode": "BA"
	},
	{
		"id": 2908200,
		"name": "Conceição da Feira",
		"stateCode": "BA"
	},
	{
		"id": 2908309,
		"name": "Conceição do Almeida",
		"stateCode": "BA"
	},
	{
		"id": 2908408,
		"name": "Conceição do Coité",
		"stateCode": "BA"
	},
	{
		"id": 2908507,
		"name": "Conceição do Jacuípe",
		"stateCode": "BA"
	},
	{
		"id": 2908606,
		"name": "Conde",
		"stateCode": "BA"
	},
	{
		"id": 2908705,
		"name": "Condeúba",
		"stateCode": "BA"
	},
	{
		"id": 2908804,
		"name": "Contendas do Sincorá",
		"stateCode": "BA"
	},
	{
		"id": 2908903,
		"name": "Coração de Maria",
		"stateCode": "BA"
	},
	{
		"id": 2909000,
		"name": "Cordeiros",
		"stateCode": "BA"
	},
	{
		"id": 2909109,
		"name": "Coribe",
		"stateCode": "BA"
	},
	{
		"id": 2909208,
		"name": "Coronel João Sá",
		"stateCode": "BA"
	},
	{
		"id": 2909307,
		"name": "Correntina",
		"stateCode": "BA"
	},
	{
		"id": 2909406,
		"name": "Cotegipe",
		"stateCode": "BA"
	},
	{
		"id": 2909505,
		"name": "Cravolândia",
		"stateCode": "BA"
	},
	{
		"id": 2909604,
		"name": "Crisópolis",
		"stateCode": "BA"
	},
	{
		"id": 2909703,
		"name": "Cristópolis",
		"stateCode": "BA"
	},
	{
		"id": 2909802,
		"name": "Cruz das Almas",
		"stateCode": "BA"
	},
	{
		"id": 2909901,
		"name": "Curaçá",
		"stateCode": "BA"
	},
	{
		"id": 2910008,
		"name": "Dário Meira",
		"stateCode": "BA"
	},
	{
		"id": 2910057,
		"name": "Dias d'Ávila",
		"stateCode": "BA"
	},
	{
		"id": 2910107,
		"name": "Dom Basílio",
		"stateCode": "BA"
	},
	{
		"id": 2910206,
		"name": "Dom Macedo Costa",
		"stateCode": "BA"
	},
	{
		"id": 2910305,
		"name": "Elísio Medrado",
		"stateCode": "BA"
	},
	{
		"id": 2910404,
		"name": "Encruzilhada",
		"stateCode": "BA"
	},
	{
		"id": 2910503,
		"name": "Entre Rios",
		"stateCode": "BA"
	},
	{
		"id": 2900504,
		"name": "Érico Cardoso",
		"stateCode": "BA"
	},
	{
		"id": 2910602,
		"name": "Esplanada",
		"stateCode": "BA"
	},
	{
		"id": 2910701,
		"name": "Euclides da Cunha",
		"stateCode": "BA"
	},
	{
		"id": 2910727,
		"name": "Eunápolis",
		"stateCode": "BA"
	},
	{
		"id": 2910750,
		"name": "Fátima",
		"stateCode": "BA"
	},
	{
		"id": 2910776,
		"name": "Feira da Mata",
		"stateCode": "BA"
	},
	{
		"id": 2910800,
		"name": "Feira de Santana",
		"stateCode": "BA"
	},
	{
		"id": 2910859,
		"name": "Filadélfia",
		"stateCode": "BA"
	},
	{
		"id": 2910909,
		"name": "Firmino Alves",
		"stateCode": "BA"
	},
	{
		"id": 2911006,
		"name": "Floresta Azul",
		"stateCode": "BA"
	},
	{
		"id": 2911105,
		"name": "Formosa do Rio Preto",
		"stateCode": "BA"
	},
	{
		"id": 2911204,
		"name": "Gandu",
		"stateCode": "BA"
	},
	{
		"id": 2911253,
		"name": "Gavião",
		"stateCode": "BA"
	},
	{
		"id": 2911303,
		"name": "Gentio do Ouro",
		"stateCode": "BA"
	},
	{
		"id": 2911402,
		"name": "Glória",
		"stateCode": "BA"
	},
	{
		"id": 2911501,
		"name": "Gongogi",
		"stateCode": "BA"
	},
	{
		"id": 2911600,
		"name": "Governador Mangabeira",
		"stateCode": "BA"
	},
	{
		"id": 2911659,
		"name": "Guajeru",
		"stateCode": "BA"
	},
	{
		"id": 2911709,
		"name": "Guanambi",
		"stateCode": "BA"
	},
	{
		"id": 2911808,
		"name": "Guaratinga",
		"stateCode": "BA"
	},
	{
		"id": 2911857,
		"name": "Heliópolis",
		"stateCode": "BA"
	},
	{
		"id": 2911907,
		"name": "Iaçu",
		"stateCode": "BA"
	},
	{
		"id": 2912004,
		"name": "Ibiassucê",
		"stateCode": "BA"
	},
	{
		"id": 2912103,
		"name": "Ibicaraí",
		"stateCode": "BA"
	},
	{
		"id": 2912202,
		"name": "Ibicoara",
		"stateCode": "BA"
	},
	{
		"id": 2912301,
		"name": "Ibicuí",
		"stateCode": "BA"
	},
	{
		"id": 2912400,
		"name": "Ibipeba",
		"stateCode": "BA"
	},
	{
		"id": 2912509,
		"name": "Ibipitanga",
		"stateCode": "BA"
	},
	{
		"id": 2912608,
		"name": "Ibiquera",
		"stateCode": "BA"
	},
	{
		"id": 2912707,
		"name": "Ibirapitanga",
		"stateCode": "BA"
	},
	{
		"id": 2912806,
		"name": "Ibirapuã",
		"stateCode": "BA"
	},
	{
		"id": 2912905,
		"name": "Ibirataia",
		"stateCode": "BA"
	},
	{
		"id": 2913002,
		"name": "Ibitiara",
		"stateCode": "BA"
	},
	{
		"id": 2913101,
		"name": "Ibititá",
		"stateCode": "BA"
	},
	{
		"id": 2913200,
		"name": "Ibotirama",
		"stateCode": "BA"
	},
	{
		"id": 2913309,
		"name": "Ichu",
		"stateCode": "BA"
	},
	{
		"id": 2913408,
		"name": "Igaporã",
		"stateCode": "BA"
	},
	{
		"id": 2913457,
		"name": "Igrapiúna",
		"stateCode": "BA"
	},
	{
		"id": 2913507,
		"name": "Iguaí",
		"stateCode": "BA"
	},
	{
		"id": 2913606,
		"name": "Ilhéus",
		"stateCode": "BA"
	},
	{
		"id": 2913705,
		"name": "Inhambupe",
		"stateCode": "BA"
	},
	{
		"id": 2913804,
		"name": "Ipecaetá",
		"stateCode": "BA"
	},
	{
		"id": 2913903,
		"name": "Ipiaú",
		"stateCode": "BA"
	},
	{
		"id": 2914000,
		"name": "Ipirá",
		"stateCode": "BA"
	},
	{
		"id": 2914109,
		"name": "Ipupiara",
		"stateCode": "BA"
	},
	{
		"id": 2914208,
		"name": "Irajuba",
		"stateCode": "BA"
	},
	{
		"id": 2914307,
		"name": "Iramaia",
		"stateCode": "BA"
	},
	{
		"id": 2914406,
		"name": "Iraquara",
		"stateCode": "BA"
	},
	{
		"id": 2914505,
		"name": "Irará",
		"stateCode": "BA"
	},
	{
		"id": 2914604,
		"name": "Irecê",
		"stateCode": "BA"
	},
	{
		"id": 2914653,
		"name": "Itabela",
		"stateCode": "BA"
	},
	{
		"id": 2914703,
		"name": "Itaberaba",
		"stateCode": "BA"
	},
	{
		"id": 2914802,
		"name": "Itabuna",
		"stateCode": "BA"
	},
	{
		"id": 2914901,
		"name": "Itacaré",
		"stateCode": "BA"
	},
	{
		"id": 2915007,
		"name": "Itaeté",
		"stateCode": "BA"
	},
	{
		"id": 2915106,
		"name": "Itagi",
		"stateCode": "BA"
	},
	{
		"id": 2915205,
		"name": "Itagibá",
		"stateCode": "BA"
	},
	{
		"id": 2915304,
		"name": "Itagimirim",
		"stateCode": "BA"
	},
	{
		"id": 2915353,
		"name": "Itaguaçu da Bahia",
		"stateCode": "BA"
	},
	{
		"id": 2915403,
		"name": "Itaju do Colônia",
		"stateCode": "BA"
	},
	{
		"id": 2915502,
		"name": "Itajuípe",
		"stateCode": "BA"
	},
	{
		"id": 2915601,
		"name": "Itamaraju",
		"stateCode": "BA"
	},
	{
		"id": 2915700,
		"name": "Itamari",
		"stateCode": "BA"
	},
	{
		"id": 2915809,
		"name": "Itambé",
		"stateCode": "BA"
	},
	{
		"id": 2915908,
		"name": "Itanagra",
		"stateCode": "BA"
	},
	{
		"id": 2916005,
		"name": "Itanhém",
		"stateCode": "BA"
	},
	{
		"id": 2916104,
		"name": "Itaparica",
		"stateCode": "BA"
	},
	{
		"id": 2916203,
		"name": "Itapé",
		"stateCode": "BA"
	},
	{
		"id": 2916302,
		"name": "Itapebi",
		"stateCode": "BA"
	},
	{
		"id": 2916401,
		"name": "Itapetinga",
		"stateCode": "BA"
	},
	{
		"id": 2916500,
		"name": "Itapicuru",
		"stateCode": "BA"
	},
	{
		"id": 2916609,
		"name": "Itapitanga",
		"stateCode": "BA"
	},
	{
		"id": 2916708,
		"name": "Itaquara",
		"stateCode": "BA"
	},
	{
		"id": 2916807,
		"name": "Itarantim",
		"stateCode": "BA"
	},
	{
		"id": 2916856,
		"name": "Itatim",
		"stateCode": "BA"
	},
	{
		"id": 2916906,
		"name": "Itiruçu",
		"stateCode": "BA"
	},
	{
		"id": 2917003,
		"name": "Itiúba",
		"stateCode": "BA"
	},
	{
		"id": 2917102,
		"name": "Itororó",
		"stateCode": "BA"
	},
	{
		"id": 2917201,
		"name": "Ituaçu",
		"stateCode": "BA"
	},
	{
		"id": 2917300,
		"name": "Ituberá",
		"stateCode": "BA"
	},
	{
		"id": 2917334,
		"name": "Iuiu",
		"stateCode": "BA"
	},
	{
		"id": 2917359,
		"name": "Jaborandi",
		"stateCode": "BA"
	},
	{
		"id": 2917409,
		"name": "Jacaraci",
		"stateCode": "BA"
	},
	{
		"id": 2917508,
		"name": "Jacobina",
		"stateCode": "BA"
	},
	{
		"id": 2917607,
		"name": "Jaguaquara",
		"stateCode": "BA"
	},
	{
		"id": 2917706,
		"name": "Jaguarari",
		"stateCode": "BA"
	},
	{
		"id": 2917805,
		"name": "Jaguaripe",
		"stateCode": "BA"
	},
	{
		"id": 2917904,
		"name": "Jandaíra",
		"stateCode": "BA"
	},
	{
		"id": 2918001,
		"name": "Jequié",
		"stateCode": "BA"
	},
	{
		"id": 2918100,
		"name": "Jeremoabo",
		"stateCode": "BA"
	},
	{
		"id": 2918209,
		"name": "Jiquiriçá",
		"stateCode": "BA"
	},
	{
		"id": 2918308,
		"name": "Jitaúna",
		"stateCode": "BA"
	},
	{
		"id": 2918357,
		"name": "João Dourado",
		"stateCode": "BA"
	},
	{
		"id": 2918407,
		"name": "Juazeiro",
		"stateCode": "BA"
	},
	{
		"id": 2918456,
		"name": "Jucuruçu",
		"stateCode": "BA"
	},
	{
		"id": 2918506,
		"name": "Jussara",
		"stateCode": "BA"
	},
	{
		"id": 2918555,
		"name": "Jussari",
		"stateCode": "BA"
	},
	{
		"id": 2918605,
		"name": "Jussiape",
		"stateCode": "BA"
	},
	{
		"id": 2918704,
		"name": "Lafaiete Coutinho",
		"stateCode": "BA"
	},
	{
		"id": 2918753,
		"name": "Lagoa Real",
		"stateCode": "BA"
	},
	{
		"id": 2918803,
		"name": "Laje",
		"stateCode": "BA"
	},
	{
		"id": 2918902,
		"name": "Lajedão",
		"stateCode": "BA"
	},
	{
		"id": 2919009,
		"name": "Lajedinho",
		"stateCode": "BA"
	},
	{
		"id": 2919058,
		"name": "Lajedo do Tabocal",
		"stateCode": "BA"
	},
	{
		"id": 2919108,
		"name": "Lamarão",
		"stateCode": "BA"
	},
	{
		"id": 2919157,
		"name": "Lapão",
		"stateCode": "BA"
	},
	{
		"id": 2919207,
		"name": "Lauro de Freitas",
		"stateCode": "BA"
	},
	{
		"id": 2919306,
		"name": "Lençóis",
		"stateCode": "BA"
	},
	{
		"id": 2919405,
		"name": "Licínio de Almeida",
		"stateCode": "BA"
	},
	{
		"id": 2919504,
		"name": "Livramento de Nossa Senhora",
		"stateCode": "BA"
	},
	{
		"id": 2919553,
		"name": "Luís Eduardo Magalhães",
		"stateCode": "BA"
	},
	{
		"id": 2919603,
		"name": "Macajuba",
		"stateCode": "BA"
	},
	{
		"id": 2919702,
		"name": "Macarani",
		"stateCode": "BA"
	},
	{
		"id": 2919801,
		"name": "Macaúbas",
		"stateCode": "BA"
	},
	{
		"id": 2919900,
		"name": "Macururé",
		"stateCode": "BA"
	},
	{
		"id": 2919926,
		"name": "Madre de Deus",
		"stateCode": "BA"
	},
	{
		"id": 2919959,
		"name": "Maetinga",
		"stateCode": "BA"
	},
	{
		"id": 2920007,
		"name": "Maiquinique",
		"stateCode": "BA"
	},
	{
		"id": 2920106,
		"name": "Mairi",
		"stateCode": "BA"
	},
	{
		"id": 2920205,
		"name": "Malhada",
		"stateCode": "BA"
	},
	{
		"id": 2920304,
		"name": "Malhada de Pedras",
		"stateCode": "BA"
	},
	{
		"id": 2920403,
		"name": "Manoel Vitorino",
		"stateCode": "BA"
	},
	{
		"id": 2920452,
		"name": "Mansidão",
		"stateCode": "BA"
	},
	{
		"id": 2920502,
		"name": "Maracás",
		"stateCode": "BA"
	},
	{
		"id": 2920601,
		"name": "Maragogipe",
		"stateCode": "BA"
	},
	{
		"id": 2920700,
		"name": "Maraú",
		"stateCode": "BA"
	},
	{
		"id": 2920809,
		"name": "Marcionílio Souza",
		"stateCode": "BA"
	},
	{
		"id": 2920908,
		"name": "Mascote",
		"stateCode": "BA"
	},
	{
		"id": 2921005,
		"name": "Mata de São João",
		"stateCode": "BA"
	},
	{
		"id": 2921054,
		"name": "Matina",
		"stateCode": "BA"
	},
	{
		"id": 2921104,
		"name": "Medeiros Neto",
		"stateCode": "BA"
	},
	{
		"id": 2921203,
		"name": "Miguel Calmon",
		"stateCode": "BA"
	},
	{
		"id": 2921302,
		"name": "Milagres",
		"stateCode": "BA"
	},
	{
		"id": 2921401,
		"name": "Mirangaba",
		"stateCode": "BA"
	},
	{
		"id": 2921450,
		"name": "Mirante",
		"stateCode": "BA"
	},
	{
		"id": 2921500,
		"name": "Monte Santo",
		"stateCode": "BA"
	},
	{
		"id": 2921609,
		"name": "Morpará",
		"stateCode": "BA"
	},
	{
		"id": 2921708,
		"name": "Morro do Chapéu",
		"stateCode": "BA"
	},
	{
		"id": 2921807,
		"name": "Mortugaba",
		"stateCode": "BA"
	},
	{
		"id": 2921906,
		"name": "Mucugê",
		"stateCode": "BA"
	},
	{
		"id": 2922003,
		"name": "Mucuri",
		"stateCode": "BA"
	},
	{
		"id": 2922052,
		"name": "Mulungu do Morro",
		"stateCode": "BA"
	},
	{
		"id": 2922102,
		"name": "Mundo Novo",
		"stateCode": "BA"
	},
	{
		"id": 2922201,
		"name": "Muniz Ferreira",
		"stateCode": "BA"
	},
	{
		"id": 2922250,
		"name": "Muquém do São Francisco",
		"stateCode": "BA"
	},
	{
		"id": 2922300,
		"name": "Muritiba",
		"stateCode": "BA"
	},
	{
		"id": 2922409,
		"name": "Mutuípe",
		"stateCode": "BA"
	},
	{
		"id": 2922508,
		"name": "Nazaré",
		"stateCode": "BA"
	},
	{
		"id": 2922607,
		"name": "Nilo Peçanha",
		"stateCode": "BA"
	},
	{
		"id": 2922656,
		"name": "Nordestina",
		"stateCode": "BA"
	},
	{
		"id": 2922706,
		"name": "Nova Canaã",
		"stateCode": "BA"
	},
	{
		"id": 2922730,
		"name": "Nova Fátima",
		"stateCode": "BA"
	},
	{
		"id": 2922755,
		"name": "Nova Ibiá",
		"stateCode": "BA"
	},
	{
		"id": 2922805,
		"name": "Nova Itarana",
		"stateCode": "BA"
	},
	{
		"id": 2922854,
		"name": "Nova Redenção",
		"stateCode": "BA"
	},
	{
		"id": 2922904,
		"name": "Nova Soure",
		"stateCode": "BA"
	},
	{
		"id": 2923001,
		"name": "Nova Viçosa",
		"stateCode": "BA"
	},
	{
		"id": 2923035,
		"name": "Novo Horizonte",
		"stateCode": "BA"
	},
	{
		"id": 2923050,
		"name": "Novo Triunfo",
		"stateCode": "BA"
	},
	{
		"id": 2923100,
		"name": "Olindina",
		"stateCode": "BA"
	},
	{
		"id": 2923209,
		"name": "Oliveira dos Brejinhos",
		"stateCode": "BA"
	},
	{
		"id": 2923308,
		"name": "Ouriçangas",
		"stateCode": "BA"
	},
	{
		"id": 2923357,
		"name": "Ourolândia",
		"stateCode": "BA"
	},
	{
		"id": 2923407,
		"name": "Palmas de Monte Alto",
		"stateCode": "BA"
	},
	{
		"id": 2923506,
		"name": "Palmeiras",
		"stateCode": "BA"
	},
	{
		"id": 2923605,
		"name": "Paramirim",
		"stateCode": "BA"
	},
	{
		"id": 2923704,
		"name": "Paratinga",
		"stateCode": "BA"
	},
	{
		"id": 2923803,
		"name": "Paripiranga",
		"stateCode": "BA"
	},
	{
		"id": 2923902,
		"name": "Pau Brasil",
		"stateCode": "BA"
	},
	{
		"id": 2924009,
		"name": "Paulo Afonso",
		"stateCode": "BA"
	},
	{
		"id": 2924058,
		"name": "Pé de Serra",
		"stateCode": "BA"
	},
	{
		"id": 2924108,
		"name": "Pedrão",
		"stateCode": "BA"
	},
	{
		"id": 2924207,
		"name": "Pedro Alexandre",
		"stateCode": "BA"
	},
	{
		"id": 2924306,
		"name": "Piatã",
		"stateCode": "BA"
	},
	{
		"id": 2924405,
		"name": "Pilão Arcado",
		"stateCode": "BA"
	},
	{
		"id": 2924504,
		"name": "Pindaí",
		"stateCode": "BA"
	},
	{
		"id": 2924603,
		"name": "Pindobaçu",
		"stateCode": "BA"
	},
	{
		"id": 2924652,
		"name": "Pintadas",
		"stateCode": "BA"
	},
	{
		"id": 2924678,
		"name": "Piraí do Norte",
		"stateCode": "BA"
	},
	{
		"id": 2924702,
		"name": "Piripá",
		"stateCode": "BA"
	},
	{
		"id": 2924801,
		"name": "Piritiba",
		"stateCode": "BA"
	},
	{
		"id": 2924900,
		"name": "Planaltino",
		"stateCode": "BA"
	},
	{
		"id": 2925006,
		"name": "Planalto",
		"stateCode": "BA"
	},
	{
		"id": 2925105,
		"name": "Poções",
		"stateCode": "BA"
	},
	{
		"id": 2925204,
		"name": "Pojuca",
		"stateCode": "BA"
	},
	{
		"id": 2925253,
		"name": "Ponto Novo",
		"stateCode": "BA"
	},
	{
		"id": 2925303,
		"name": "Porto Seguro",
		"stateCode": "BA"
	},
	{
		"id": 2925402,
		"name": "Potiraguá",
		"stateCode": "BA"
	},
	{
		"id": 2925501,
		"name": "Prado",
		"stateCode": "BA"
	},
	{
		"id": 2925600,
		"name": "Presidente Dutra",
		"stateCode": "BA"
	},
	{
		"id": 2925709,
		"name": "Presidente Jânio Quadros",
		"stateCode": "BA"
	},
	{
		"id": 2925758,
		"name": "Presidente Tancredo Neves",
		"stateCode": "BA"
	},
	{
		"id": 2925808,
		"name": "Queimadas",
		"stateCode": "BA"
	},
	{
		"id": 2925907,
		"name": "Quijingue",
		"stateCode": "BA"
	},
	{
		"id": 2925931,
		"name": "Quixabeira",
		"stateCode": "BA"
	},
	{
		"id": 2925956,
		"name": "Rafael Jambeiro",
		"stateCode": "BA"
	},
	{
		"id": 2926004,
		"name": "Remanso",
		"stateCode": "BA"
	},
	{
		"id": 2926103,
		"name": "Retirolândia",
		"stateCode": "BA"
	},
	{
		"id": 2926202,
		"name": "Riachão das Neves",
		"stateCode": "BA"
	},
	{
		"id": 2926301,
		"name": "Riachão do Jacuípe",
		"stateCode": "BA"
	},
	{
		"id": 2926400,
		"name": "Riacho de Santana",
		"stateCode": "BA"
	},
	{
		"id": 2926509,
		"name": "Ribeira do Amparo",
		"stateCode": "BA"
	},
	{
		"id": 2926608,
		"name": "Ribeira do Pombal",
		"stateCode": "BA"
	},
	{
		"id": 2926657,
		"name": "Ribeirão do Largo",
		"stateCode": "BA"
	},
	{
		"id": 2926707,
		"name": "Rio de Contas",
		"stateCode": "BA"
	},
	{
		"id": 2926806,
		"name": "Rio do Antônio",
		"stateCode": "BA"
	},
	{
		"id": 2926905,
		"name": "Rio do Pires",
		"stateCode": "BA"
	},
	{
		"id": 2927002,
		"name": "Rio Real",
		"stateCode": "BA"
	},
	{
		"id": 2927101,
		"name": "Rodelas",
		"stateCode": "BA"
	},
	{
		"id": 2927200,
		"name": "Ruy Barbosa",
		"stateCode": "BA"
	},
	{
		"id": 2927309,
		"name": "Salinas da Margarida",
		"stateCode": "BA"
	},
	{
		"id": 2927408,
		"name": "Salvador",
		"stateCode": "BA"
	},
	{
		"id": 2927507,
		"name": "Santa Bárbara",
		"stateCode": "BA"
	},
	{
		"id": 2927606,
		"name": "Santa Brígida",
		"stateCode": "BA"
	},
	{
		"id": 2927705,
		"name": "Santa Cruz Cabrália",
		"stateCode": "BA"
	},
	{
		"id": 2927804,
		"name": "Santa Cruz da Vitória",
		"stateCode": "BA"
	},
	{
		"id": 2927903,
		"name": "Santa Inês",
		"stateCode": "BA"
	},
	{
		"id": 2928059,
		"name": "Santa Luzia",
		"stateCode": "BA"
	},
	{
		"id": 2928109,
		"name": "Santa Maria da Vitória",
		"stateCode": "BA"
	},
	{
		"id": 2928406,
		"name": "Santa Rita de Cássia",
		"stateCode": "BA"
	},
	{
		"id": 2928505,
		"name": "Santa Terezinha",
		"stateCode": "BA"
	},
	{
		"id": 2928000,
		"name": "Santaluz",
		"stateCode": "BA"
	},
	{
		"id": 2928208,
		"name": "Santana",
		"stateCode": "BA"
	},
	{
		"id": 2928307,
		"name": "Santanópolis",
		"stateCode": "BA"
	},
	{
		"id": 2928604,
		"name": "Santo Amaro",
		"stateCode": "BA"
	},
	{
		"id": 2928703,
		"name": "Santo Antônio de Jesus",
		"stateCode": "BA"
	},
	{
		"id": 2928802,
		"name": "Santo Estêvão",
		"stateCode": "BA"
	},
	{
		"id": 2928901,
		"name": "São Desidério",
		"stateCode": "BA"
	},
	{
		"id": 2928950,
		"name": "São Domingos",
		"stateCode": "BA"
	},
	{
		"id": 2929107,
		"name": "São Felipe",
		"stateCode": "BA"
	},
	{
		"id": 2929008,
		"name": "São Félix",
		"stateCode": "BA"
	},
	{
		"id": 2929057,
		"name": "São Félix do Coribe",
		"stateCode": "BA"
	},
	{
		"id": 2929206,
		"name": "São Francisco do Conde",
		"stateCode": "BA"
	},
	{
		"id": 2929255,
		"name": "São Gabriel",
		"stateCode": "BA"
	},
	{
		"id": 2929305,
		"name": "São Gonçalo dos Campos",
		"stateCode": "BA"
	},
	{
		"id": 2929354,
		"name": "São José da Vitória",
		"stateCode": "BA"
	},
	{
		"id": 2929370,
		"name": "São José do Jacuípe",
		"stateCode": "BA"
	},
	{
		"id": 2929404,
		"name": "São Miguel das Matas",
		"stateCode": "BA"
	},
	{
		"id": 2929503,
		"name": "São Sebastião do Passé",
		"stateCode": "BA"
	},
	{
		"id": 2929602,
		"name": "Sapeaçu",
		"stateCode": "BA"
	},
	{
		"id": 2929701,
		"name": "Sátiro Dias",
		"stateCode": "BA"
	},
	{
		"id": 2929750,
		"name": "Saubara",
		"stateCode": "BA"
	},
	{
		"id": 2929800,
		"name": "Saúde",
		"stateCode": "BA"
	},
	{
		"id": 2929909,
		"name": "Seabra",
		"stateCode": "BA"
	},
	{
		"id": 2930006,
		"name": "Sebastião Laranjeiras",
		"stateCode": "BA"
	},
	{
		"id": 2930105,
		"name": "Senhor do Bonfim",
		"stateCode": "BA"
	},
	{
		"id": 2930204,
		"name": "Sento Sé",
		"stateCode": "BA"
	},
	{
		"id": 2930154,
		"name": "Serra do Ramalho",
		"stateCode": "BA"
	},
	{
		"id": 2930303,
		"name": "Serra Dourada",
		"stateCode": "BA"
	},
	{
		"id": 2930402,
		"name": "Serra Preta",
		"stateCode": "BA"
	},
	{
		"id": 2930501,
		"name": "Serrinha",
		"stateCode": "BA"
	},
	{
		"id": 2930600,
		"name": "Serrolândia",
		"stateCode": "BA"
	},
	{
		"id": 2930709,
		"name": "Simões Filho",
		"stateCode": "BA"
	},
	{
		"id": 2930758,
		"name": "Sítio do Mato",
		"stateCode": "BA"
	},
	{
		"id": 2930766,
		"name": "Sítio do Quinto",
		"stateCode": "BA"
	},
	{
		"id": 2930774,
		"name": "Sobradinho",
		"stateCode": "BA"
	},
	{
		"id": 2930808,
		"name": "Souto Soares",
		"stateCode": "BA"
	},
	{
		"id": 2930907,
		"name": "Tabocas do Brejo Velho",
		"stateCode": "BA"
	},
	{
		"id": 2931004,
		"name": "Tanhaçu",
		"stateCode": "BA"
	},
	{
		"id": 2931053,
		"name": "Tanque Novo",
		"stateCode": "BA"
	},
	{
		"id": 2931103,
		"name": "Tanquinho",
		"stateCode": "BA"
	},
	{
		"id": 2931202,
		"name": "Taperoá",
		"stateCode": "BA"
	},
	{
		"id": 2931301,
		"name": "Tapiramutá",
		"stateCode": "BA"
	},
	{
		"id": 2931350,
		"name": "Teixeira de Freitas",
		"stateCode": "BA"
	},
	{
		"id": 2931400,
		"name": "Teodoro Sampaio",
		"stateCode": "BA"
	},
	{
		"id": 2931509,
		"name": "Teofilândia",
		"stateCode": "BA"
	},
	{
		"id": 2931608,
		"name": "Teolândia",
		"stateCode": "BA"
	},
	{
		"id": 2931707,
		"name": "Terra Nova",
		"stateCode": "BA"
	},
	{
		"id": 2931806,
		"name": "Tremedal",
		"stateCode": "BA"
	},
	{
		"id": 2931905,
		"name": "Tucano",
		"stateCode": "BA"
	},
	{
		"id": 2932002,
		"name": "Uauá",
		"stateCode": "BA"
	},
	{
		"id": 2932101,
		"name": "Ubaíra",
		"stateCode": "BA"
	},
	{
		"id": 2932200,
		"name": "Ubaitaba",
		"stateCode": "BA"
	},
	{
		"id": 2932309,
		"name": "Ubatã",
		"stateCode": "BA"
	},
	{
		"id": 2932408,
		"name": "Uibaí",
		"stateCode": "BA"
	},
	{
		"id": 2932457,
		"name": "Umburanas",
		"stateCode": "BA"
	},
	{
		"id": 2932507,
		"name": "Una",
		"stateCode": "BA"
	},
	{
		"id": 2932606,
		"name": "Urandi",
		"stateCode": "BA"
	},
	{
		"id": 2932705,
		"name": "Uruçuca",
		"stateCode": "BA"
	},
	{
		"id": 2932804,
		"name": "Utinga",
		"stateCode": "BA"
	},
	{
		"id": 2932903,
		"name": "Valença",
		"stateCode": "BA"
	},
	{
		"id": 2933000,
		"name": "Valente",
		"stateCode": "BA"
	},
	{
		"id": 2933059,
		"name": "Várzea da Roça",
		"stateCode": "BA"
	},
	{
		"id": 2933109,
		"name": "Várzea do Poço",
		"stateCode": "BA"
	},
	{
		"id": 2933158,
		"name": "Várzea Nova",
		"stateCode": "BA"
	},
	{
		"id": 2933174,
		"name": "Varzedo",
		"stateCode": "BA"
	},
	{
		"id": 2933208,
		"name": "Vera Cruz",
		"stateCode": "BA"
	},
	{
		"id": 2933257,
		"name": "Vereda",
		"stateCode": "BA"
	},
	{
		"id": 2933307,
		"name": "Vitória da Conquista",
		"stateCode": "BA"
	},
	{
		"id": 2933406,
		"name": "Wagner",
		"stateCode": "BA"
	},
	{
		"id": 2933455,
		"name": "Wanderley",
		"stateCode": "BA"
	},
	{
		"id": 2933505,
		"name": "Wenceslau Guimarães",
		"stateCode": "BA"
	},
	{
		"id": 2933604,
		"name": "Xique-Xique",
		"stateCode": "BA"
	},
	{
		"id": 2300101,
		"name": "Abaiara",
		"stateCode": "CE"
	},
	{
		"id": 2300150,
		"name": "Acarape",
		"stateCode": "CE"
	},
	{
		"id": 2300200,
		"name": "Acaraú",
		"stateCode": "CE"
	},
	{
		"id": 2300309,
		"name": "Acopiara",
		"stateCode": "CE"
	},
	{
		"id": 2300408,
		"name": "Aiuaba",
		"stateCode": "CE"
	},
	{
		"id": 2300507,
		"name": "Alcântaras",
		"stateCode": "CE"
	},
	{
		"id": 2300606,
		"name": "Altaneira",
		"stateCode": "CE"
	},
	{
		"id": 2300705,
		"name": "Alto Santo",
		"stateCode": "CE"
	},
	{
		"id": 2300754,
		"name": "Amontada",
		"stateCode": "CE"
	},
	{
		"id": 2300804,
		"name": "Antonina do Norte",
		"stateCode": "CE"
	},
	{
		"id": 2300903,
		"name": "Apuiarés",
		"stateCode": "CE"
	},
	{
		"id": 2301000,
		"name": "Aquiraz",
		"stateCode": "CE"
	},
	{
		"id": 2301109,
		"name": "Aracati",
		"stateCode": "CE"
	},
	{
		"id": 2301208,
		"name": "Aracoiaba",
		"stateCode": "CE"
	},
	{
		"id": 2301257,
		"name": "Ararendá",
		"stateCode": "CE"
	},
	{
		"id": 2301307,
		"name": "Araripe",
		"stateCode": "CE"
	},
	{
		"id": 2301406,
		"name": "Aratuba",
		"stateCode": "CE"
	},
	{
		"id": 2301505,
		"name": "Arneiroz",
		"stateCode": "CE"
	},
	{
		"id": 2301604,
		"name": "Assaré",
		"stateCode": "CE"
	},
	{
		"id": 2301703,
		"name": "Aurora",
		"stateCode": "CE"
	},
	{
		"id": 2301802,
		"name": "Baixio",
		"stateCode": "CE"
	},
	{
		"id": 2301851,
		"name": "Banabuiú",
		"stateCode": "CE"
	},
	{
		"id": 2301901,
		"name": "Barbalha",
		"stateCode": "CE"
	},
	{
		"id": 2301950,
		"name": "Barreira",
		"stateCode": "CE"
	},
	{
		"id": 2302008,
		"name": "Barro",
		"stateCode": "CE"
	},
	{
		"id": 2302057,
		"name": "Barroquinha",
		"stateCode": "CE"
	},
	{
		"id": 2302107,
		"name": "Baturité",
		"stateCode": "CE"
	},
	{
		"id": 2302206,
		"name": "Beberibe",
		"stateCode": "CE"
	},
	{
		"id": 2302305,
		"name": "Bela Cruz",
		"stateCode": "CE"
	},
	{
		"id": 2302404,
		"name": "Boa Viagem",
		"stateCode": "CE"
	},
	{
		"id": 2302503,
		"name": "Brejo Santo",
		"stateCode": "CE"
	},
	{
		"id": 2302602,
		"name": "Camocim",
		"stateCode": "CE"
	},
	{
		"id": 2302701,
		"name": "Campos Sales",
		"stateCode": "CE"
	},
	{
		"id": 2302800,
		"name": "Canindé",
		"stateCode": "CE"
	},
	{
		"id": 2302909,
		"name": "Capistrano",
		"stateCode": "CE"
	},
	{
		"id": 2303006,
		"name": "Caridade",
		"stateCode": "CE"
	},
	{
		"id": 2303105,
		"name": "Cariré",
		"stateCode": "CE"
	},
	{
		"id": 2303204,
		"name": "Caririaçu",
		"stateCode": "CE"
	},
	{
		"id": 2303303,
		"name": "Cariús",
		"stateCode": "CE"
	},
	{
		"id": 2303402,
		"name": "Carnaubal",
		"stateCode": "CE"
	},
	{
		"id": 2303501,
		"name": "Cascavel",
		"stateCode": "CE"
	},
	{
		"id": 2303600,
		"name": "Catarina",
		"stateCode": "CE"
	},
	{
		"id": 2303659,
		"name": "Catunda",
		"stateCode": "CE"
	},
	{
		"id": 2303709,
		"name": "Caucaia",
		"stateCode": "CE"
	},
	{
		"id": 2303808,
		"name": "Cedro",
		"stateCode": "CE"
	},
	{
		"id": 2303907,
		"name": "Chaval",
		"stateCode": "CE"
	},
	{
		"id": 2303931,
		"name": "Choró",
		"stateCode": "CE"
	},
	{
		"id": 2303956,
		"name": "Chorozinho",
		"stateCode": "CE"
	},
	{
		"id": 2304004,
		"name": "Coreaú",
		"stateCode": "CE"
	},
	{
		"id": 2304103,
		"name": "Crateús",
		"stateCode": "CE"
	},
	{
		"id": 2304202,
		"name": "Crato",
		"stateCode": "CE"
	},
	{
		"id": 2304236,
		"name": "Croatá",
		"stateCode": "CE"
	},
	{
		"id": 2304251,
		"name": "Cruz",
		"stateCode": "CE"
	},
	{
		"id": 2304269,
		"name": "Deputado Irapuan Pinheiro",
		"stateCode": "CE"
	},
	{
		"id": 2304277,
		"name": "Ereré",
		"stateCode": "CE"
	},
	{
		"id": 2304285,
		"name": "Eusébio",
		"stateCode": "CE"
	},
	{
		"id": 2304301,
		"name": "Farias Brito",
		"stateCode": "CE"
	},
	{
		"id": 2304350,
		"name": "Forquilha",
		"stateCode": "CE"
	},
	{
		"id": 2304400,
		"name": "Fortaleza",
		"stateCode": "CE"
	},
	{
		"id": 2304459,
		"name": "Fortim",
		"stateCode": "CE"
	},
	{
		"id": 2304509,
		"name": "Frecheirinha",
		"stateCode": "CE"
	},
	{
		"id": 2304608,
		"name": "General Sampaio",
		"stateCode": "CE"
	},
	{
		"id": 2304657,
		"name": "Graça",
		"stateCode": "CE"
	},
	{
		"id": 2304707,
		"name": "Granja",
		"stateCode": "CE"
	},
	{
		"id": 2304806,
		"name": "Granjeiro",
		"stateCode": "CE"
	},
	{
		"id": 2304905,
		"name": "Groaíras",
		"stateCode": "CE"
	},
	{
		"id": 2304954,
		"name": "Guaiúba",
		"stateCode": "CE"
	},
	{
		"id": 2305001,
		"name": "Guaraciaba do Norte",
		"stateCode": "CE"
	},
	{
		"id": 2305100,
		"name": "Guaramiranga",
		"stateCode": "CE"
	},
	{
		"id": 2305209,
		"name": "Hidrolândia",
		"stateCode": "CE"
	},
	{
		"id": 2305233,
		"name": "Horizonte",
		"stateCode": "CE"
	},
	{
		"id": 2305266,
		"name": "Ibaretama",
		"stateCode": "CE"
	},
	{
		"id": 2305308,
		"name": "Ibiapina",
		"stateCode": "CE"
	},
	{
		"id": 2305332,
		"name": "Ibicuitinga",
		"stateCode": "CE"
	},
	{
		"id": 2305357,
		"name": "Icapuí",
		"stateCode": "CE"
	},
	{
		"id": 2305407,
		"name": "Icó",
		"stateCode": "CE"
	},
	{
		"id": 2305506,
		"name": "Iguatu",
		"stateCode": "CE"
	},
	{
		"id": 2305605,
		"name": "Independência",
		"stateCode": "CE"
	},
	{
		"id": 2305654,
		"name": "Ipaporanga",
		"stateCode": "CE"
	},
	{
		"id": 2305704,
		"name": "Ipaumirim",
		"stateCode": "CE"
	},
	{
		"id": 2305803,
		"name": "Ipu",
		"stateCode": "CE"
	},
	{
		"id": 2305902,
		"name": "Ipueiras",
		"stateCode": "CE"
	},
	{
		"id": 2306009,
		"name": "Iracema",
		"stateCode": "CE"
	},
	{
		"id": 2306108,
		"name": "Irauçuba",
		"stateCode": "CE"
	},
	{
		"id": 2306207,
		"name": "Itaiçaba",
		"stateCode": "CE"
	},
	{
		"id": 2306256,
		"name": "Itaitinga",
		"stateCode": "CE"
	},
	{
		"id": 2306306,
		"name": "Itapajé",
		"stateCode": "CE"
	},
	{
		"id": 2306405,
		"name": "Itapipoca",
		"stateCode": "CE"
	},
	{
		"id": 2306504,
		"name": "Itapiúna",
		"stateCode": "CE"
	},
	{
		"id": 2306553,
		"name": "Itarema",
		"stateCode": "CE"
	},
	{
		"id": 2306603,
		"name": "Itatira",
		"stateCode": "CE"
	},
	{
		"id": 2306702,
		"name": "Jaguaretama",
		"stateCode": "CE"
	},
	{
		"id": 2306801,
		"name": "Jaguaribara",
		"stateCode": "CE"
	},
	{
		"id": 2306900,
		"name": "Jaguaribe",
		"stateCode": "CE"
	},
	{
		"id": 2307007,
		"name": "Jaguaruana",
		"stateCode": "CE"
	},
	{
		"id": 2307106,
		"name": "Jardim",
		"stateCode": "CE"
	},
	{
		"id": 2307205,
		"name": "Jati",
		"stateCode": "CE"
	},
	{
		"id": 2307254,
		"name": "Jijoca de Jericoacoara",
		"stateCode": "CE"
	},
	{
		"id": 2307304,
		"name": "Juazeiro do Norte",
		"stateCode": "CE"
	},
	{
		"id": 2307403,
		"name": "Jucás",
		"stateCode": "CE"
	},
	{
		"id": 2307502,
		"name": "Lavras da Mangabeira",
		"stateCode": "CE"
	},
	{
		"id": 2307601,
		"name": "Limoeiro do Norte",
		"stateCode": "CE"
	},
	{
		"id": 2307635,
		"name": "Madalena",
		"stateCode": "CE"
	},
	{
		"id": 2307650,
		"name": "Maracanaú",
		"stateCode": "CE"
	},
	{
		"id": 2307700,
		"name": "Maranguape",
		"stateCode": "CE"
	},
	{
		"id": 2307809,
		"name": "Marco",
		"stateCode": "CE"
	},
	{
		"id": 2307908,
		"name": "Martinópole",
		"stateCode": "CE"
	},
	{
		"id": 2308005,
		"name": "Massapê",
		"stateCode": "CE"
	},
	{
		"id": 2308104,
		"name": "Mauriti",
		"stateCode": "CE"
	},
	{
		"id": 2308203,
		"name": "Meruoca",
		"stateCode": "CE"
	},
	{
		"id": 2308302,
		"name": "Milagres",
		"stateCode": "CE"
	},
	{
		"id": 2308351,
		"name": "Milhã",
		"stateCode": "CE"
	},
	{
		"id": 2308377,
		"name": "Miraíma",
		"stateCode": "CE"
	},
	{
		"id": 2308401,
		"name": "Missão Velha",
		"stateCode": "CE"
	},
	{
		"id": 2308500,
		"name": "Mombaça",
		"stateCode": "CE"
	},
	{
		"id": 2308609,
		"name": "Monsenhor Tabosa",
		"stateCode": "CE"
	},
	{
		"id": 2308708,
		"name": "Morada Nova",
		"stateCode": "CE"
	},
	{
		"id": 2308807,
		"name": "Moraújo",
		"stateCode": "CE"
	},
	{
		"id": 2308906,
		"name": "Morrinhos",
		"stateCode": "CE"
	},
	{
		"id": 2309003,
		"name": "Mucambo",
		"stateCode": "CE"
	},
	{
		"id": 2309102,
		"name": "Mulungu",
		"stateCode": "CE"
	},
	{
		"id": 2309201,
		"name": "Nova Olinda",
		"stateCode": "CE"
	},
	{
		"id": 2309300,
		"name": "Nova Russas",
		"stateCode": "CE"
	},
	{
		"id": 2309409,
		"name": "Novo Oriente",
		"stateCode": "CE"
	},
	{
		"id": 2309458,
		"name": "Ocara",
		"stateCode": "CE"
	},
	{
		"id": 2309508,
		"name": "Orós",
		"stateCode": "CE"
	},
	{
		"id": 2309607,
		"name": "Pacajus",
		"stateCode": "CE"
	},
	{
		"id": 2309706,
		"name": "Pacatuba",
		"stateCode": "CE"
	},
	{
		"id": 2309805,
		"name": "Pacoti",
		"stateCode": "CE"
	},
	{
		"id": 2309904,
		"name": "Pacujá",
		"stateCode": "CE"
	},
	{
		"id": 2310001,
		"name": "Palhano",
		"stateCode": "CE"
	},
	{
		"id": 2310100,
		"name": "Palmácia",
		"stateCode": "CE"
	},
	{
		"id": 2310209,
		"name": "Paracuru",
		"stateCode": "CE"
	},
	{
		"id": 2310258,
		"name": "Paraipaba",
		"stateCode": "CE"
	},
	{
		"id": 2310308,
		"name": "Parambu",
		"stateCode": "CE"
	},
	{
		"id": 2310407,
		"name": "Paramoti",
		"stateCode": "CE"
	},
	{
		"id": 2310506,
		"name": "Pedra Branca",
		"stateCode": "CE"
	},
	{
		"id": 2310605,
		"name": "Penaforte",
		"stateCode": "CE"
	},
	{
		"id": 2310704,
		"name": "Pentecoste",
		"stateCode": "CE"
	},
	{
		"id": 2310803,
		"name": "Pereiro",
		"stateCode": "CE"
	},
	{
		"id": 2310852,
		"name": "Pindoretama",
		"stateCode": "CE"
	},
	{
		"id": 2310902,
		"name": "Piquet Carneiro",
		"stateCode": "CE"
	},
	{
		"id": 2310951,
		"name": "Pires Ferreira",
		"stateCode": "CE"
	},
	{
		"id": 2311009,
		"name": "Poranga",
		"stateCode": "CE"
	},
	{
		"id": 2311108,
		"name": "Porteiras",
		"stateCode": "CE"
	},
	{
		"id": 2311207,
		"name": "Potengi",
		"stateCode": "CE"
	},
	{
		"id": 2311231,
		"name": "Potiretama",
		"stateCode": "CE"
	},
	{
		"id": 2311264,
		"name": "Quiterianópolis",
		"stateCode": "CE"
	},
	{
		"id": 2311306,
		"name": "Quixadá",
		"stateCode": "CE"
	},
	{
		"id": 2311355,
		"name": "Quixelô",
		"stateCode": "CE"
	},
	{
		"id": 2311405,
		"name": "Quixeramobim",
		"stateCode": "CE"
	},
	{
		"id": 2311504,
		"name": "Quixeré",
		"stateCode": "CE"
	},
	{
		"id": 2311603,
		"name": "Redenção",
		"stateCode": "CE"
	},
	{
		"id": 2311702,
		"name": "Reriutaba",
		"stateCode": "CE"
	},
	{
		"id": 2311801,
		"name": "Russas",
		"stateCode": "CE"
	},
	{
		"id": 2311900,
		"name": "Saboeiro",
		"stateCode": "CE"
	},
	{
		"id": 2311959,
		"name": "Salitre",
		"stateCode": "CE"
	},
	{
		"id": 2312205,
		"name": "Santa Quitéria",
		"stateCode": "CE"
	},
	{
		"id": 2312007,
		"name": "Santana do Acaraú",
		"stateCode": "CE"
	},
	{
		"id": 2312106,
		"name": "Santana do Cariri",
		"stateCode": "CE"
	},
	{
		"id": 2312304,
		"name": "São Benedito",
		"stateCode": "CE"
	},
	{
		"id": 2312403,
		"name": "São Gonçalo do Amarante",
		"stateCode": "CE"
	},
	{
		"id": 2312502,
		"name": "São João do Jaguaribe",
		"stateCode": "CE"
	},
	{
		"id": 2312601,
		"name": "São Luís do Curu",
		"stateCode": "CE"
	},
	{
		"id": 2312700,
		"name": "Senador Pompeu",
		"stateCode": "CE"
	},
	{
		"id": 2312809,
		"name": "Senador Sá",
		"stateCode": "CE"
	},
	{
		"id": 2312908,
		"name": "Sobral",
		"stateCode": "CE"
	},
	{
		"id": 2313005,
		"name": "Solonópole",
		"stateCode": "CE"
	},
	{
		"id": 2313104,
		"name": "Tabuleiro do Norte",
		"stateCode": "CE"
	},
	{
		"id": 2313203,
		"name": "Tamboril",
		"stateCode": "CE"
	},
	{
		"id": 2313252,
		"name": "Tarrafas",
		"stateCode": "CE"
	},
	{
		"id": 2313302,
		"name": "Tauá",
		"stateCode": "CE"
	},
	{
		"id": 2313351,
		"name": "Tejuçuoca",
		"stateCode": "CE"
	},
	{
		"id": 2313401,
		"name": "Tianguá",
		"stateCode": "CE"
	},
	{
		"id": 2313500,
		"name": "Trairi",
		"stateCode": "CE"
	},
	{
		"id": 2313559,
		"name": "Tururu",
		"stateCode": "CE"
	},
	{
		"id": 2313609,
		"name": "Ubajara",
		"stateCode": "CE"
	},
	{
		"id": 2313708,
		"name": "Umari",
		"stateCode": "CE"
	},
	{
		"id": 2313757,
		"name": "Umirim",
		"stateCode": "CE"
	},
	{
		"id": 2313807,
		"name": "Uruburetama",
		"stateCode": "CE"
	},
	{
		"id": 2313906,
		"name": "Uruoca",
		"stateCode": "CE"
	},
	{
		"id": 2313955,
		"name": "Varjota",
		"stateCode": "CE"
	},
	{
		"id": 2314003,
		"name": "Várzea Alegre",
		"stateCode": "CE"
	},
	{
		"id": 2314102,
		"name": "Viçosa do Ceará",
		"stateCode": "CE"
	},
	{
		"id": 5300108,
		"name": "Brasília",
		"stateCode": "DF"
	},
	{
		"id": 3200102,
		"name": "Afonso Cláudio",
		"stateCode": "ES"
	},
	{
		"id": 3200169,
		"name": "Água Doce do Norte",
		"stateCode": "ES"
	},
	{
		"id": 3200136,
		"name": "Águia Branca",
		"stateCode": "ES"
	},
	{
		"id": 3200201,
		"name": "Alegre",
		"stateCode": "ES"
	},
	{
		"id": 3200300,
		"name": "Alfredo Chaves",
		"stateCode": "ES"
	},
	{
		"id": 3200359,
		"name": "Alto Rio Novo",
		"stateCode": "ES"
	},
	{
		"id": 3200409,
		"name": "Anchieta",
		"stateCode": "ES"
	},
	{
		"id": 3200508,
		"name": "Apiacá",
		"stateCode": "ES"
	},
	{
		"id": 3200607,
		"name": "Aracruz",
		"stateCode": "ES"
	},
	{
		"id": 3200706,
		"name": "Atílio Vivácqua",
		"stateCode": "ES"
	},
	{
		"id": 3200805,
		"name": "Baixo Guandu",
		"stateCode": "ES"
	},
	{
		"id": 3200904,
		"name": "Barra de São Francisco",
		"stateCode": "ES"
	},
	{
		"id": 3201001,
		"name": "Boa Esperança",
		"stateCode": "ES"
	},
	{
		"id": 3201100,
		"name": "Bom Jesus do Norte",
		"stateCode": "ES"
	},
	{
		"id": 3201159,
		"name": "Brejetuba",
		"stateCode": "ES"
	},
	{
		"id": 3201209,
		"name": "Cachoeiro de Itapemirim",
		"stateCode": "ES"
	},
	{
		"id": 3201308,
		"name": "Cariacica",
		"stateCode": "ES"
	},
	{
		"id": 3201407,
		"name": "Castelo",
		"stateCode": "ES"
	},
	{
		"id": 3201506,
		"name": "Colatina",
		"stateCode": "ES"
	},
	{
		"id": 3201605,
		"name": "Conceição da Barra",
		"stateCode": "ES"
	},
	{
		"id": 3201704,
		"name": "Conceição do Castelo",
		"stateCode": "ES"
	},
	{
		"id": 3201803,
		"name": "Divino de São Lourenço",
		"stateCode": "ES"
	},
	{
		"id": 3201902,
		"name": "Domingos Martins",
		"stateCode": "ES"
	},
	{
		"id": 3202009,
		"name": "Dores do Rio Preto",
		"stateCode": "ES"
	},
	{
		"id": 3202108,
		"name": "Ecoporanga",
		"stateCode": "ES"
	},
	{
		"id": 3202207,
		"name": "Fundão",
		"stateCode": "ES"
	},
	{
		"id": 3202256,
		"name": "Governador Lindenberg",
		"stateCode": "ES"
	},
	{
		"id": 3202306,
		"name": "Guaçuí",
		"stateCode": "ES"
	},
	{
		"id": 3202405,
		"name": "Guarapari",
		"stateCode": "ES"
	},
	{
		"id": 3202454,
		"name": "Ibatiba",
		"stateCode": "ES"
	},
	{
		"id": 3202504,
		"name": "Ibiraçu",
		"stateCode": "ES"
	},
	{
		"id": 3202553,
		"name": "Ibitirama",
		"stateCode": "ES"
	},
	{
		"id": 3202603,
		"name": "Iconha",
		"stateCode": "ES"
	},
	{
		"id": 3202652,
		"name": "Irupi",
		"stateCode": "ES"
	},
	{
		"id": 3202702,
		"name": "Itaguaçu",
		"stateCode": "ES"
	},
	{
		"id": 3202801,
		"name": "Itapemirim",
		"stateCode": "ES"
	},
	{
		"id": 3202900,
		"name": "Itarana",
		"stateCode": "ES"
	},
	{
		"id": 3203007,
		"name": "Iúna",
		"stateCode": "ES"
	},
	{
		"id": 3203056,
		"name": "Jaguaré",
		"stateCode": "ES"
	},
	{
		"id": 3203106,
		"name": "Jerônimo Monteiro",
		"stateCode": "ES"
	},
	{
		"id": 3203130,
		"name": "João Neiva",
		"stateCode": "ES"
	},
	{
		"id": 3203163,
		"name": "Laranja da Terra",
		"stateCode": "ES"
	},
	{
		"id": 3203205,
		"name": "Linhares",
		"stateCode": "ES"
	},
	{
		"id": 3203304,
		"name": "Mantenópolis",
		"stateCode": "ES"
	},
	{
		"id": 3203320,
		"name": "Marataízes",
		"stateCode": "ES"
	},
	{
		"id": 3203346,
		"name": "Marechal Floriano",
		"stateCode": "ES"
	},
	{
		"id": 3203353,
		"name": "Marilândia",
		"stateCode": "ES"
	},
	{
		"id": 3203403,
		"name": "Mimoso do Sul",
		"stateCode": "ES"
	},
	{
		"id": 3203502,
		"name": "Montanha",
		"stateCode": "ES"
	},
	{
		"id": 3203601,
		"name": "Mucurici",
		"stateCode": "ES"
	},
	{
		"id": 3203700,
		"name": "Muniz Freire",
		"stateCode": "ES"
	},
	{
		"id": 3203809,
		"name": "Muqui",
		"stateCode": "ES"
	},
	{
		"id": 3203908,
		"name": "Nova Venécia",
		"stateCode": "ES"
	},
	{
		"id": 3204005,
		"name": "Pancas",
		"stateCode": "ES"
	},
	{
		"id": 3204054,
		"name": "Pedro Canário",
		"stateCode": "ES"
	},
	{
		"id": 3204104,
		"name": "Pinheiros",
		"stateCode": "ES"
	},
	{
		"id": 3204203,
		"name": "Piúma",
		"stateCode": "ES"
	},
	{
		"id": 3204252,
		"name": "Ponto Belo",
		"stateCode": "ES"
	},
	{
		"id": 3204302,
		"name": "Presidente Kennedy",
		"stateCode": "ES"
	},
	{
		"id": 3204351,
		"name": "Rio Bananal",
		"stateCode": "ES"
	},
	{
		"id": 3204401,
		"name": "Rio Novo do Sul",
		"stateCode": "ES"
	},
	{
		"id": 3204500,
		"name": "Santa Leopoldina",
		"stateCode": "ES"
	},
	{
		"id": 3204559,
		"name": "Santa Maria de Jetibá",
		"stateCode": "ES"
	},
	{
		"id": 3204609,
		"name": "Santa Teresa",
		"stateCode": "ES"
	},
	{
		"id": 3204658,
		"name": "São Domingos do Norte",
		"stateCode": "ES"
	},
	{
		"id": 3204708,
		"name": "São Gabriel da Palha",
		"stateCode": "ES"
	},
	{
		"id": 3204807,
		"name": "São José do Calçado",
		"stateCode": "ES"
	},
	{
		"id": 3204906,
		"name": "São Mateus",
		"stateCode": "ES"
	},
	{
		"id": 3204955,
		"name": "São Roque do Canaã",
		"stateCode": "ES"
	},
	{
		"id": 3205002,
		"name": "Serra",
		"stateCode": "ES"
	},
	{
		"id": 3205010,
		"name": "Sooretama",
		"stateCode": "ES"
	},
	{
		"id": 3205036,
		"name": "Vargem Alta",
		"stateCode": "ES"
	},
	{
		"id": 3205069,
		"name": "Venda Nova do Imigrante",
		"stateCode": "ES"
	},
	{
		"id": 3205101,
		"name": "Viana",
		"stateCode": "ES"
	},
	{
		"id": 3205150,
		"name": "Vila Pavão",
		"stateCode": "ES"
	},
	{
		"id": 3205176,
		"name": "Vila Valério",
		"stateCode": "ES"
	},
	{
		"id": 3205200,
		"name": "Vila Velha",
		"stateCode": "ES"
	},
	{
		"id": 3205309,
		"name": "Vitória",
		"stateCode": "ES"
	},
	{
		"id": 5200050,
		"name": "Abadia de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5200100,
		"name": "Abadiânia",
		"stateCode": "GO"
	},
	{
		"id": 5200134,
		"name": "Acreúna",
		"stateCode": "GO"
	},
	{
		"id": 5200159,
		"name": "Adelândia",
		"stateCode": "GO"
	},
	{
		"id": 5200175,
		"name": "Água Fria de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5200209,
		"name": "Água Limpa",
		"stateCode": "GO"
	},
	{
		"id": 5200258,
		"name": "Águas Lindas de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5200308,
		"name": "Alexânia",
		"stateCode": "GO"
	},
	{
		"id": 5200506,
		"name": "Aloândia",
		"stateCode": "GO"
	},
	{
		"id": 5200555,
		"name": "Alto Horizonte",
		"stateCode": "GO"
	},
	{
		"id": 5200605,
		"name": "Alto Paraíso de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5200803,
		"name": "Alvorada do Norte",
		"stateCode": "GO"
	},
	{
		"id": 5200829,
		"name": "Amaralina",
		"stateCode": "GO"
	},
	{
		"id": 5200852,
		"name": "Americano do Brasil",
		"stateCode": "GO"
	},
	{
		"id": 5200902,
		"name": "Amorinópolis",
		"stateCode": "GO"
	},
	{
		"id": 5201108,
		"name": "Anápolis",
		"stateCode": "GO"
	},
	{
		"id": 5201207,
		"name": "Anhanguera",
		"stateCode": "GO"
	},
	{
		"id": 5201306,
		"name": "Anicuns",
		"stateCode": "GO"
	},
	{
		"id": 5201405,
		"name": "Aparecida de Goiânia",
		"stateCode": "GO"
	},
	{
		"id": 5201454,
		"name": "Aparecida do Rio Doce",
		"stateCode": "GO"
	},
	{
		"id": 5201504,
		"name": "Aporé",
		"stateCode": "GO"
	},
	{
		"id": 5201603,
		"name": "Araçu",
		"stateCode": "GO"
	},
	{
		"id": 5201702,
		"name": "Aragarças",
		"stateCode": "GO"
	},
	{
		"id": 5201801,
		"name": "Aragoiânia",
		"stateCode": "GO"
	},
	{
		"id": 5202155,
		"name": "Araguapaz",
		"stateCode": "GO"
	},
	{
		"id": 5202353,
		"name": "Arenópolis",
		"stateCode": "GO"
	},
	{
		"id": 5202502,
		"name": "Aruanã",
		"stateCode": "GO"
	},
	{
		"id": 5202601,
		"name": "Aurilândia",
		"stateCode": "GO"
	},
	{
		"id": 5202809,
		"name": "Avelinópolis",
		"stateCode": "GO"
	},
	{
		"id": 5203104,
		"name": "Baliza",
		"stateCode": "GO"
	},
	{
		"id": 5203203,
		"name": "Barro Alto",
		"stateCode": "GO"
	},
	{
		"id": 5203302,
		"name": "Bela Vista de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5203401,
		"name": "Bom Jardim de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5203500,
		"name": "Bom Jesus de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5203559,
		"name": "Bonfinópolis",
		"stateCode": "GO"
	},
	{
		"id": 5203575,
		"name": "Bonópolis",
		"stateCode": "GO"
	},
	{
		"id": 5203609,
		"name": "Brazabrantes",
		"stateCode": "GO"
	},
	{
		"id": 5203807,
		"name": "Britânia",
		"stateCode": "GO"
	},
	{
		"id": 5203906,
		"name": "Buriti Alegre",
		"stateCode": "GO"
	},
	{
		"id": 5203939,
		"name": "Buriti de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5203962,
		"name": "Buritinópolis",
		"stateCode": "GO"
	},
	{
		"id": 5204003,
		"name": "Cabeceiras",
		"stateCode": "GO"
	},
	{
		"id": 5204102,
		"name": "Cachoeira Alta",
		"stateCode": "GO"
	},
	{
		"id": 5204201,
		"name": "Cachoeira de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5204250,
		"name": "Cachoeira Dourada",
		"stateCode": "GO"
	},
	{
		"id": 5204300,
		"name": "Caçu",
		"stateCode": "GO"
	},
	{
		"id": 5204409,
		"name": "Caiapônia",
		"stateCode": "GO"
	},
	{
		"id": 5204508,
		"name": "Caldas Novas",
		"stateCode": "GO"
	},
	{
		"id": 5204557,
		"name": "Caldazinha",
		"stateCode": "GO"
	},
	{
		"id": 5204607,
		"name": "Campestre de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5204656,
		"name": "Campinaçu",
		"stateCode": "GO"
	},
	{
		"id": 5204706,
		"name": "Campinorte",
		"stateCode": "GO"
	},
	{
		"id": 5204805,
		"name": "Campo Alegre de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5204854,
		"name": "Campo Limpo de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5204904,
		"name": "Campos Belos",
		"stateCode": "GO"
	},
	{
		"id": 5204953,
		"name": "Campos Verdes",
		"stateCode": "GO"
	},
	{
		"id": 5205000,
		"name": "Carmo do Rio Verde",
		"stateCode": "GO"
	},
	{
		"id": 5205059,
		"name": "Castelândia",
		"stateCode": "GO"
	},
	{
		"id": 5205109,
		"name": "Catalão",
		"stateCode": "GO"
	},
	{
		"id": 5205208,
		"name": "Caturaí",
		"stateCode": "GO"
	},
	{
		"id": 5205307,
		"name": "Cavalcante",
		"stateCode": "GO"
	},
	{
		"id": 5205406,
		"name": "Ceres",
		"stateCode": "GO"
	},
	{
		"id": 5205455,
		"name": "Cezarina",
		"stateCode": "GO"
	},
	{
		"id": 5205471,
		"name": "Chapadão do Céu",
		"stateCode": "GO"
	},
	{
		"id": 5205497,
		"name": "Cidade Ocidental",
		"stateCode": "GO"
	},
	{
		"id": 5205513,
		"name": "Cocalzinho de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5205521,
		"name": "Colinas do Sul",
		"stateCode": "GO"
	},
	{
		"id": 5205703,
		"name": "Córrego do Ouro",
		"stateCode": "GO"
	},
	{
		"id": 5205802,
		"name": "Corumbá de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5205901,
		"name": "Corumbaíba",
		"stateCode": "GO"
	},
	{
		"id": 5206206,
		"name": "Cristalina",
		"stateCode": "GO"
	},
	{
		"id": 5206305,
		"name": "Cristianópolis",
		"stateCode": "GO"
	},
	{
		"id": 5206404,
		"name": "Crixás",
		"stateCode": "GO"
	},
	{
		"id": 5206503,
		"name": "Cromínia",
		"stateCode": "GO"
	},
	{
		"id": 5206602,
		"name": "Cumari",
		"stateCode": "GO"
	},
	{
		"id": 5206701,
		"name": "Damianópolis",
		"stateCode": "GO"
	},
	{
		"id": 5206800,
		"name": "Damolândia",
		"stateCode": "GO"
	},
	{
		"id": 5206909,
		"name": "Davinópolis",
		"stateCode": "GO"
	},
	{
		"id": 5207105,
		"name": "Diorama",
		"stateCode": "GO"
	},
	{
		"id": 5208301,
		"name": "Divinópolis de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5207253,
		"name": "Doverlândia",
		"stateCode": "GO"
	},
	{
		"id": 5207352,
		"name": "Edealina",
		"stateCode": "GO"
	},
	{
		"id": 5207402,
		"name": "Edéia",
		"stateCode": "GO"
	},
	{
		"id": 5207501,
		"name": "Estrela do Norte",
		"stateCode": "GO"
	},
	{
		"id": 5207535,
		"name": "Faina",
		"stateCode": "GO"
	},
	{
		"id": 5207600,
		"name": "Fazenda Nova",
		"stateCode": "GO"
	},
	{
		"id": 5207808,
		"name": "Firminópolis",
		"stateCode": "GO"
	},
	{
		"id": 5207907,
		"name": "Flores de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5208004,
		"name": "Formosa",
		"stateCode": "GO"
	},
	{
		"id": 5208103,
		"name": "Formoso",
		"stateCode": "GO"
	},
	{
		"id": 5208152,
		"name": "Gameleira de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5208400,
		"name": "Goianápolis",
		"stateCode": "GO"
	},
	{
		"id": 5208509,
		"name": "Goiandira",
		"stateCode": "GO"
	},
	{
		"id": 5208608,
		"name": "Goianésia",
		"stateCode": "GO"
	},
	{
		"id": 5208707,
		"name": "Goiânia",
		"stateCode": "GO"
	},
	{
		"id": 5208806,
		"name": "Goianira",
		"stateCode": "GO"
	},
	{
		"id": 5208905,
		"name": "Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5209101,
		"name": "Goiatuba",
		"stateCode": "GO"
	},
	{
		"id": 5209150,
		"name": "Gouvelândia",
		"stateCode": "GO"
	},
	{
		"id": 5209200,
		"name": "Guapó",
		"stateCode": "GO"
	},
	{
		"id": 5209291,
		"name": "Guaraíta",
		"stateCode": "GO"
	},
	{
		"id": 5209408,
		"name": "Guarani de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5209457,
		"name": "Guarinos",
		"stateCode": "GO"
	},
	{
		"id": 5209606,
		"name": "Heitoraí",
		"stateCode": "GO"
	},
	{
		"id": 5209705,
		"name": "Hidrolândia",
		"stateCode": "GO"
	},
	{
		"id": 5209804,
		"name": "Hidrolina",
		"stateCode": "GO"
	},
	{
		"id": 5209903,
		"name": "Iaciara",
		"stateCode": "GO"
	},
	{
		"id": 5209937,
		"name": "Inaciolândia",
		"stateCode": "GO"
	},
	{
		"id": 5209952,
		"name": "Indiara",
		"stateCode": "GO"
	},
	{
		"id": 5210000,
		"name": "Inhumas",
		"stateCode": "GO"
	},
	{
		"id": 5210109,
		"name": "Ipameri",
		"stateCode": "GO"
	},
	{
		"id": 5210158,
		"name": "Ipiranga de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5210208,
		"name": "Iporá",
		"stateCode": "GO"
	},
	{
		"id": 5210307,
		"name": "Israelândia",
		"stateCode": "GO"
	},
	{
		"id": 5210406,
		"name": "Itaberaí",
		"stateCode": "GO"
	},
	{
		"id": 5210562,
		"name": "Itaguari",
		"stateCode": "GO"
	},
	{
		"id": 5210604,
		"name": "Itaguaru",
		"stateCode": "GO"
	},
	{
		"id": 5210802,
		"name": "Itajá",
		"stateCode": "GO"
	},
	{
		"id": 5210901,
		"name": "Itapaci",
		"stateCode": "GO"
	},
	{
		"id": 5211008,
		"name": "Itapirapuã",
		"stateCode": "GO"
	},
	{
		"id": 5211206,
		"name": "Itapuranga",
		"stateCode": "GO"
	},
	{
		"id": 5211305,
		"name": "Itarumã",
		"stateCode": "GO"
	},
	{
		"id": 5211404,
		"name": "Itauçu",
		"stateCode": "GO"
	},
	{
		"id": 5211503,
		"name": "Itumbiara",
		"stateCode": "GO"
	},
	{
		"id": 5211602,
		"name": "Ivolândia",
		"stateCode": "GO"
	},
	{
		"id": 5211701,
		"name": "Jandaia",
		"stateCode": "GO"
	},
	{
		"id": 5211800,
		"name": "Jaraguá",
		"stateCode": "GO"
	},
	{
		"id": 5211909,
		"name": "Jataí",
		"stateCode": "GO"
	},
	{
		"id": 5212006,
		"name": "Jaupaci",
		"stateCode": "GO"
	},
	{
		"id": 5212055,
		"name": "Jesúpolis",
		"stateCode": "GO"
	},
	{
		"id": 5212105,
		"name": "Joviânia",
		"stateCode": "GO"
	},
	{
		"id": 5212204,
		"name": "Jussara",
		"stateCode": "GO"
	},
	{
		"id": 5212253,
		"name": "Lagoa Santa",
		"stateCode": "GO"
	},
	{
		"id": 5212303,
		"name": "Leopoldo de Bulhões",
		"stateCode": "GO"
	},
	{
		"id": 5212501,
		"name": "Luziânia",
		"stateCode": "GO"
	},
	{
		"id": 5212600,
		"name": "Mairipotaba",
		"stateCode": "GO"
	},
	{
		"id": 5212709,
		"name": "Mambaí",
		"stateCode": "GO"
	},
	{
		"id": 5212808,
		"name": "Mara Rosa",
		"stateCode": "GO"
	},
	{
		"id": 5212907,
		"name": "Marzagão",
		"stateCode": "GO"
	},
	{
		"id": 5212956,
		"name": "Matrinchã",
		"stateCode": "GO"
	},
	{
		"id": 5213004,
		"name": "Maurilândia",
		"stateCode": "GO"
	},
	{
		"id": 5213053,
		"name": "Mimoso de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5213087,
		"name": "Minaçu",
		"stateCode": "GO"
	},
	{
		"id": 5213103,
		"name": "Mineiros",
		"stateCode": "GO"
	},
	{
		"id": 5213400,
		"name": "Moiporá",
		"stateCode": "GO"
	},
	{
		"id": 5213509,
		"name": "Monte Alegre de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5213707,
		"name": "Montes Claros de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5213756,
		"name": "Montividiu",
		"stateCode": "GO"
	},
	{
		"id": 5213772,
		"name": "Montividiu do Norte",
		"stateCode": "GO"
	},
	{
		"id": 5213806,
		"name": "Morrinhos",
		"stateCode": "GO"
	},
	{
		"id": 5213855,
		"name": "Morro Agudo de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5213905,
		"name": "Mossâmedes",
		"stateCode": "GO"
	},
	{
		"id": 5214002,
		"name": "Mozarlândia",
		"stateCode": "GO"
	},
	{
		"id": 5214051,
		"name": "Mundo Novo",
		"stateCode": "GO"
	},
	{
		"id": 5214101,
		"name": "Mutunópolis",
		"stateCode": "GO"
	},
	{
		"id": 5214408,
		"name": "Nazário",
		"stateCode": "GO"
	},
	{
		"id": 5214507,
		"name": "Nerópolis",
		"stateCode": "GO"
	},
	{
		"id": 5214606,
		"name": "Niquelândia",
		"stateCode": "GO"
	},
	{
		"id": 5214705,
		"name": "Nova América",
		"stateCode": "GO"
	},
	{
		"id": 5214804,
		"name": "Nova Aurora",
		"stateCode": "GO"
	},
	{
		"id": 5214838,
		"name": "Nova Crixás",
		"stateCode": "GO"
	},
	{
		"id": 5214861,
		"name": "Nova Glória",
		"stateCode": "GO"
	},
	{
		"id": 5214879,
		"name": "Nova Iguaçu de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5214903,
		"name": "Nova Roma",
		"stateCode": "GO"
	},
	{
		"id": 5215009,
		"name": "Nova Veneza",
		"stateCode": "GO"
	},
	{
		"id": 5215207,
		"name": "Novo Brasil",
		"stateCode": "GO"
	},
	{
		"id": 5215231,
		"name": "Novo Gama",
		"stateCode": "GO"
	},
	{
		"id": 5215256,
		"name": "Novo Planalto",
		"stateCode": "GO"
	},
	{
		"id": 5215306,
		"name": "Orizona",
		"stateCode": "GO"
	},
	{
		"id": 5215405,
		"name": "Ouro Verde de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5215504,
		"name": "Ouvidor",
		"stateCode": "GO"
	},
	{
		"id": 5215603,
		"name": "Padre Bernardo",
		"stateCode": "GO"
	},
	{
		"id": 5215652,
		"name": "Palestina de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5215702,
		"name": "Palmeiras de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5215801,
		"name": "Palmelo",
		"stateCode": "GO"
	},
	{
		"id": 5215900,
		"name": "Palminópolis",
		"stateCode": "GO"
	},
	{
		"id": 5216007,
		"name": "Panamá",
		"stateCode": "GO"
	},
	{
		"id": 5216304,
		"name": "Paranaiguara",
		"stateCode": "GO"
	},
	{
		"id": 5216403,
		"name": "Paraúna",
		"stateCode": "GO"
	},
	{
		"id": 5216452,
		"name": "Perolândia",
		"stateCode": "GO"
	},
	{
		"id": 5216809,
		"name": "Petrolina de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5216908,
		"name": "Pilar de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5217104,
		"name": "Piracanjuba",
		"stateCode": "GO"
	},
	{
		"id": 5217203,
		"name": "Piranhas",
		"stateCode": "GO"
	},
	{
		"id": 5217302,
		"name": "Pirenópolis",
		"stateCode": "GO"
	},
	{
		"id": 5217401,
		"name": "Pires do Rio",
		"stateCode": "GO"
	},
	{
		"id": 5217609,
		"name": "Planaltina",
		"stateCode": "GO"
	},
	{
		"id": 5217708,
		"name": "Pontalina",
		"stateCode": "GO"
	},
	{
		"id": 5218003,
		"name": "Porangatu",
		"stateCode": "GO"
	},
	{
		"id": 5218052,
		"name": "Porteirão",
		"stateCode": "GO"
	},
	{
		"id": 5218102,
		"name": "Portelândia",
		"stateCode": "GO"
	},
	{
		"id": 5218300,
		"name": "Posse",
		"stateCode": "GO"
	},
	{
		"id": 5218391,
		"name": "Professor Jamil",
		"stateCode": "GO"
	},
	{
		"id": 5218508,
		"name": "Quirinópolis",
		"stateCode": "GO"
	},
	{
		"id": 5218607,
		"name": "Rialma",
		"stateCode": "GO"
	},
	{
		"id": 5218706,
		"name": "Rianápolis",
		"stateCode": "GO"
	},
	{
		"id": 5218789,
		"name": "Rio Quente",
		"stateCode": "GO"
	},
	{
		"id": 5218805,
		"name": "Rio Verde",
		"stateCode": "GO"
	},
	{
		"id": 5218904,
		"name": "Rubiataba",
		"stateCode": "GO"
	},
	{
		"id": 5219001,
		"name": "Sanclerlândia",
		"stateCode": "GO"
	},
	{
		"id": 5219100,
		"name": "Santa Bárbara de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5219209,
		"name": "Santa Cruz de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5219258,
		"name": "Santa Fé de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5219308,
		"name": "Santa Helena de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5219357,
		"name": "Santa Isabel",
		"stateCode": "GO"
	},
	{
		"id": 5219407,
		"name": "Santa Rita do Araguaia",
		"stateCode": "GO"
	},
	{
		"id": 5219456,
		"name": "Santa Rita do Novo Destino",
		"stateCode": "GO"
	},
	{
		"id": 5219506,
		"name": "Santa Rosa de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5219605,
		"name": "Santa Tereza de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5219704,
		"name": "Santa Terezinha de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5219712,
		"name": "Santo Antônio da Barra",
		"stateCode": "GO"
	},
	{
		"id": 5219738,
		"name": "Santo Antônio de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5219753,
		"name": "Santo Antônio do Descoberto",
		"stateCode": "GO"
	},
	{
		"id": 5219803,
		"name": "São Domingos",
		"stateCode": "GO"
	},
	{
		"id": 5219902,
		"name": "São Francisco de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5220009,
		"name": "São João d'Aliança",
		"stateCode": "GO"
	},
	{
		"id": 5220058,
		"name": "São João da Paraúna",
		"stateCode": "GO"
	},
	{
		"id": 5220108,
		"name": "São Luís de Montes Belos",
		"stateCode": "GO"
	},
	{
		"id": 5220157,
		"name": "São Luiz do Norte",
		"stateCode": "GO"
	},
	{
		"id": 5220207,
		"name": "São Miguel do Araguaia",
		"stateCode": "GO"
	},
	{
		"id": 5220264,
		"name": "São Miguel do Passa Quatro",
		"stateCode": "GO"
	},
	{
		"id": 5220280,
		"name": "São Patrício",
		"stateCode": "GO"
	},
	{
		"id": 5220405,
		"name": "São Simão",
		"stateCode": "GO"
	},
	{
		"id": 5220454,
		"name": "Senador Canedo",
		"stateCode": "GO"
	},
	{
		"id": 5220504,
		"name": "Serranópolis",
		"stateCode": "GO"
	},
	{
		"id": 5220603,
		"name": "Silvânia",
		"stateCode": "GO"
	},
	{
		"id": 5220686,
		"name": "Simolândia",
		"stateCode": "GO"
	},
	{
		"id": 5220702,
		"name": "Sítio d'Abadia",
		"stateCode": "GO"
	},
	{
		"id": 5221007,
		"name": "Taquaral de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5221080,
		"name": "Teresina de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5221197,
		"name": "Terezópolis de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5221304,
		"name": "Três Ranchos",
		"stateCode": "GO"
	},
	{
		"id": 5221403,
		"name": "Trindade",
		"stateCode": "GO"
	},
	{
		"id": 5221452,
		"name": "Trombas",
		"stateCode": "GO"
	},
	{
		"id": 5221502,
		"name": "Turvânia",
		"stateCode": "GO"
	},
	{
		"id": 5221551,
		"name": "Turvelândia",
		"stateCode": "GO"
	},
	{
		"id": 5221577,
		"name": "Uirapuru",
		"stateCode": "GO"
	},
	{
		"id": 5221601,
		"name": "Uruaçu",
		"stateCode": "GO"
	},
	{
		"id": 5221700,
		"name": "Uruana",
		"stateCode": "GO"
	},
	{
		"id": 5221809,
		"name": "Urutaí",
		"stateCode": "GO"
	},
	{
		"id": 5221858,
		"name": "Valparaíso de Goiás",
		"stateCode": "GO"
	},
	{
		"id": 5221908,
		"name": "Varjão",
		"stateCode": "GO"
	},
	{
		"id": 5222005,
		"name": "Vianópolis",
		"stateCode": "GO"
	},
	{
		"id": 5222054,
		"name": "Vicentinópolis",
		"stateCode": "GO"
	},
	{
		"id": 5222203,
		"name": "Vila Boa",
		"stateCode": "GO"
	},
	{
		"id": 5222302,
		"name": "Vila Propício",
		"stateCode": "GO"
	},
	{
		"id": 2100055,
		"name": "Açailândia",
		"stateCode": "MA"
	},
	{
		"id": 2100105,
		"name": "Afonso Cunha",
		"stateCode": "MA"
	},
	{
		"id": 2100154,
		"name": "Água Doce do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2100204,
		"name": "Alcântara",
		"stateCode": "MA"
	},
	{
		"id": 2100303,
		"name": "Aldeias Altas",
		"stateCode": "MA"
	},
	{
		"id": 2100402,
		"name": "Altamira do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2100436,
		"name": "Alto Alegre do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2100477,
		"name": "Alto Alegre do Pindaré",
		"stateCode": "MA"
	},
	{
		"id": 2100501,
		"name": "Alto Parnaíba",
		"stateCode": "MA"
	},
	{
		"id": 2100550,
		"name": "Amapá do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2100600,
		"name": "Amarante do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2100709,
		"name": "Anajatuba",
		"stateCode": "MA"
	},
	{
		"id": 2100808,
		"name": "Anapurus",
		"stateCode": "MA"
	},
	{
		"id": 2100832,
		"name": "Apicum-Açu",
		"stateCode": "MA"
	},
	{
		"id": 2100873,
		"name": "Araguanã",
		"stateCode": "MA"
	},
	{
		"id": 2100907,
		"name": "Araioses",
		"stateCode": "MA"
	},
	{
		"id": 2100956,
		"name": "Arame",
		"stateCode": "MA"
	},
	{
		"id": 2101004,
		"name": "Arari",
		"stateCode": "MA"
	},
	{
		"id": 2101103,
		"name": "Axixá",
		"stateCode": "MA"
	},
	{
		"id": 2101202,
		"name": "Bacabal",
		"stateCode": "MA"
	},
	{
		"id": 2101251,
		"name": "Bacabeira",
		"stateCode": "MA"
	},
	{
		"id": 2101301,
		"name": "Bacuri",
		"stateCode": "MA"
	},
	{
		"id": 2101350,
		"name": "Bacurituba",
		"stateCode": "MA"
	},
	{
		"id": 2101400,
		"name": "Balsas",
		"stateCode": "MA"
	},
	{
		"id": 2101509,
		"name": "Barão de Grajaú",
		"stateCode": "MA"
	},
	{
		"id": 2101608,
		"name": "Barra do Corda",
		"stateCode": "MA"
	},
	{
		"id": 2101707,
		"name": "Barreirinhas",
		"stateCode": "MA"
	},
	{
		"id": 2101772,
		"name": "Bela Vista do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2101731,
		"name": "Belágua",
		"stateCode": "MA"
	},
	{
		"id": 2101806,
		"name": "Benedito Leite",
		"stateCode": "MA"
	},
	{
		"id": 2101905,
		"name": "Bequimão",
		"stateCode": "MA"
	},
	{
		"id": 2101939,
		"name": "Bernardo do Mearim",
		"stateCode": "MA"
	},
	{
		"id": 2101970,
		"name": "Boa Vista do Gurupi",
		"stateCode": "MA"
	},
	{
		"id": 2102002,
		"name": "Bom Jardim",
		"stateCode": "MA"
	},
	{
		"id": 2102036,
		"name": "Bom Jesus das Selvas",
		"stateCode": "MA"
	},
	{
		"id": 2102077,
		"name": "Bom Lugar",
		"stateCode": "MA"
	},
	{
		"id": 2102101,
		"name": "Brejo",
		"stateCode": "MA"
	},
	{
		"id": 2102150,
		"name": "Brejo de Areia",
		"stateCode": "MA"
	},
	{
		"id": 2102200,
		"name": "Buriti",
		"stateCode": "MA"
	},
	{
		"id": 2102309,
		"name": "Buriti Bravo",
		"stateCode": "MA"
	},
	{
		"id": 2102325,
		"name": "Buriticupu",
		"stateCode": "MA"
	},
	{
		"id": 2102358,
		"name": "Buritirana",
		"stateCode": "MA"
	},
	{
		"id": 2102374,
		"name": "Cachoeira Grande",
		"stateCode": "MA"
	},
	{
		"id": 2102408,
		"name": "Cajapió",
		"stateCode": "MA"
	},
	{
		"id": 2102507,
		"name": "Cajari",
		"stateCode": "MA"
	},
	{
		"id": 2102556,
		"name": "Campestre do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2102606,
		"name": "Cândido Mendes",
		"stateCode": "MA"
	},
	{
		"id": 2102705,
		"name": "Cantanhede",
		"stateCode": "MA"
	},
	{
		"id": 2102754,
		"name": "Capinzal do Norte",
		"stateCode": "MA"
	},
	{
		"id": 2102804,
		"name": "Carolina",
		"stateCode": "MA"
	},
	{
		"id": 2102903,
		"name": "Carutapera",
		"stateCode": "MA"
	},
	{
		"id": 2103000,
		"name": "Caxias",
		"stateCode": "MA"
	},
	{
		"id": 2103109,
		"name": "Cedral",
		"stateCode": "MA"
	},
	{
		"id": 2103125,
		"name": "Central do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2103158,
		"name": "Centro do Guilherme",
		"stateCode": "MA"
	},
	{
		"id": 2103174,
		"name": "Centro Novo do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2103208,
		"name": "Chapadinha",
		"stateCode": "MA"
	},
	{
		"id": 2103257,
		"name": "Cidelândia",
		"stateCode": "MA"
	},
	{
		"id": 2103307,
		"name": "Codó",
		"stateCode": "MA"
	},
	{
		"id": 2103406,
		"name": "Coelho Neto",
		"stateCode": "MA"
	},
	{
		"id": 2103505,
		"name": "Colinas",
		"stateCode": "MA"
	},
	{
		"id": 2103554,
		"name": "Conceição do Lago-Açu",
		"stateCode": "MA"
	},
	{
		"id": 2103604,
		"name": "Coroatá",
		"stateCode": "MA"
	},
	{
		"id": 2103703,
		"name": "Cururupu",
		"stateCode": "MA"
	},
	{
		"id": 2103752,
		"name": "Davinópolis",
		"stateCode": "MA"
	},
	{
		"id": 2103802,
		"name": "Dom Pedro",
		"stateCode": "MA"
	},
	{
		"id": 2103901,
		"name": "Duque Bacelar",
		"stateCode": "MA"
	},
	{
		"id": 2104008,
		"name": "Esperantinópolis",
		"stateCode": "MA"
	},
	{
		"id": 2104057,
		"name": "Estreito",
		"stateCode": "MA"
	},
	{
		"id": 2104073,
		"name": "Feira Nova do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2104081,
		"name": "Fernando Falcão",
		"stateCode": "MA"
	},
	{
		"id": 2104099,
		"name": "Formosa da Serra Negra",
		"stateCode": "MA"
	},
	{
		"id": 2104107,
		"name": "Fortaleza dos Nogueiras",
		"stateCode": "MA"
	},
	{
		"id": 2104206,
		"name": "Fortuna",
		"stateCode": "MA"
	},
	{
		"id": 2104305,
		"name": "Godofredo Viana",
		"stateCode": "MA"
	},
	{
		"id": 2104404,
		"name": "Gonçalves Dias",
		"stateCode": "MA"
	},
	{
		"id": 2104503,
		"name": "Governador Archer",
		"stateCode": "MA"
	},
	{
		"id": 2104552,
		"name": "Governador Edison Lobão",
		"stateCode": "MA"
	},
	{
		"id": 2104602,
		"name": "Governador Eugênio Barros",
		"stateCode": "MA"
	},
	{
		"id": 2104628,
		"name": "Governador Luiz Rocha",
		"stateCode": "MA"
	},
	{
		"id": 2104651,
		"name": "Governador Newton Bello",
		"stateCode": "MA"
	},
	{
		"id": 2104677,
		"name": "Governador Nunes Freire",
		"stateCode": "MA"
	},
	{
		"id": 2104701,
		"name": "Graça Aranha",
		"stateCode": "MA"
	},
	{
		"id": 2104800,
		"name": "Grajaú",
		"stateCode": "MA"
	},
	{
		"id": 2104909,
		"name": "Guimarães",
		"stateCode": "MA"
	},
	{
		"id": 2105005,
		"name": "Humberto de Campos",
		"stateCode": "MA"
	},
	{
		"id": 2105104,
		"name": "Icatu",
		"stateCode": "MA"
	},
	{
		"id": 2105153,
		"name": "Igarapé do Meio",
		"stateCode": "MA"
	},
	{
		"id": 2105203,
		"name": "Igarapé Grande",
		"stateCode": "MA"
	},
	{
		"id": 2105302,
		"name": "Imperatriz",
		"stateCode": "MA"
	},
	{
		"id": 2105351,
		"name": "Itaipava do Grajaú",
		"stateCode": "MA"
	},
	{
		"id": 2105401,
		"name": "Itapecuru Mirim",
		"stateCode": "MA"
	},
	{
		"id": 2105427,
		"name": "Itinga do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2105450,
		"name": "Jatobá",
		"stateCode": "MA"
	},
	{
		"id": 2105476,
		"name": "Jenipapo dos Vieiras",
		"stateCode": "MA"
	},
	{
		"id": 2105500,
		"name": "João Lisboa",
		"stateCode": "MA"
	},
	{
		"id": 2105609,
		"name": "Joselândia",
		"stateCode": "MA"
	},
	{
		"id": 2105658,
		"name": "Junco do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2105708,
		"name": "Lago da Pedra",
		"stateCode": "MA"
	},
	{
		"id": 2105807,
		"name": "Lago do Junco",
		"stateCode": "MA"
	},
	{
		"id": 2105948,
		"name": "Lago dos Rodrigues",
		"stateCode": "MA"
	},
	{
		"id": 2105906,
		"name": "Lago Verde",
		"stateCode": "MA"
	},
	{
		"id": 2105922,
		"name": "Lagoa do Mato",
		"stateCode": "MA"
	},
	{
		"id": 2105963,
		"name": "Lagoa Grande do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2105989,
		"name": "Lajeado Novo",
		"stateCode": "MA"
	},
	{
		"id": 2106003,
		"name": "Lima Campos",
		"stateCode": "MA"
	},
	{
		"id": 2106102,
		"name": "Loreto",
		"stateCode": "MA"
	},
	{
		"id": 2106201,
		"name": "Luís Domingues",
		"stateCode": "MA"
	},
	{
		"id": 2106300,
		"name": "Magalhães de Almeida",
		"stateCode": "MA"
	},
	{
		"id": 2106326,
		"name": "Maracaçumé",
		"stateCode": "MA"
	},
	{
		"id": 2106359,
		"name": "Marajá do Sena",
		"stateCode": "MA"
	},
	{
		"id": 2106375,
		"name": "Maranhãozinho",
		"stateCode": "MA"
	},
	{
		"id": 2106409,
		"name": "Mata Roma",
		"stateCode": "MA"
	},
	{
		"id": 2106508,
		"name": "Matinha",
		"stateCode": "MA"
	},
	{
		"id": 2106607,
		"name": "Matões",
		"stateCode": "MA"
	},
	{
		"id": 2106631,
		"name": "Matões do Norte",
		"stateCode": "MA"
	},
	{
		"id": 2106672,
		"name": "Milagres do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2106706,
		"name": "Mirador",
		"stateCode": "MA"
	},
	{
		"id": 2106755,
		"name": "Miranda do Norte",
		"stateCode": "MA"
	},
	{
		"id": 2106805,
		"name": "Mirinzal",
		"stateCode": "MA"
	},
	{
		"id": 2106904,
		"name": "Monção",
		"stateCode": "MA"
	},
	{
		"id": 2107001,
		"name": "Montes Altos",
		"stateCode": "MA"
	},
	{
		"id": 2107100,
		"name": "Morros",
		"stateCode": "MA"
	},
	{
		"id": 2107209,
		"name": "Nina Rodrigues",
		"stateCode": "MA"
	},
	{
		"id": 2107258,
		"name": "Nova Colinas",
		"stateCode": "MA"
	},
	{
		"id": 2107308,
		"name": "Nova Iorque",
		"stateCode": "MA"
	},
	{
		"id": 2107357,
		"name": "Nova Olinda do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2107407,
		"name": "Olho d'Água das Cunhãs",
		"stateCode": "MA"
	},
	{
		"id": 2107456,
		"name": "Olinda Nova do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2107506,
		"name": "Paço do Lumiar",
		"stateCode": "MA"
	},
	{
		"id": 2107605,
		"name": "Palmeirândia",
		"stateCode": "MA"
	},
	{
		"id": 2107704,
		"name": "Paraibano",
		"stateCode": "MA"
	},
	{
		"id": 2107803,
		"name": "Parnarama",
		"stateCode": "MA"
	},
	{
		"id": 2107902,
		"name": "Passagem Franca",
		"stateCode": "MA"
	},
	{
		"id": 2108009,
		"name": "Pastos Bons",
		"stateCode": "MA"
	},
	{
		"id": 2108058,
		"name": "Paulino Neves",
		"stateCode": "MA"
	},
	{
		"id": 2108108,
		"name": "Paulo Ramos",
		"stateCode": "MA"
	},
	{
		"id": 2108207,
		"name": "Pedreiras",
		"stateCode": "MA"
	},
	{
		"id": 2108256,
		"name": "Pedro do Rosário",
		"stateCode": "MA"
	},
	{
		"id": 2108306,
		"name": "Penalva",
		"stateCode": "MA"
	},
	{
		"id": 2108405,
		"name": "Peri Mirim",
		"stateCode": "MA"
	},
	{
		"id": 2108454,
		"name": "Peritoró",
		"stateCode": "MA"
	},
	{
		"id": 2108504,
		"name": "Pindaré-Mirim",
		"stateCode": "MA"
	},
	{
		"id": 2108603,
		"name": "Pinheiro",
		"stateCode": "MA"
	},
	{
		"id": 2108702,
		"name": "Pio XII",
		"stateCode": "MA"
	},
	{
		"id": 2108801,
		"name": "Pirapemas",
		"stateCode": "MA"
	},
	{
		"id": 2108900,
		"name": "Poção de Pedras",
		"stateCode": "MA"
	},
	{
		"id": 2109007,
		"name": "Porto Franco",
		"stateCode": "MA"
	},
	{
		"id": 2109056,
		"name": "Porto Rico do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2109106,
		"name": "Presidente Dutra",
		"stateCode": "MA"
	},
	{
		"id": 2109205,
		"name": "Presidente Juscelino",
		"stateCode": "MA"
	},
	{
		"id": 2109239,
		"name": "Presidente Médici",
		"stateCode": "MA"
	},
	{
		"id": 2109270,
		"name": "Presidente Sarney",
		"stateCode": "MA"
	},
	{
		"id": 2109304,
		"name": "Presidente Vargas",
		"stateCode": "MA"
	},
	{
		"id": 2109403,
		"name": "Primeira Cruz",
		"stateCode": "MA"
	},
	{
		"id": 2109452,
		"name": "Raposa",
		"stateCode": "MA"
	},
	{
		"id": 2109502,
		"name": "Riachão",
		"stateCode": "MA"
	},
	{
		"id": 2109551,
		"name": "Ribamar Fiquene",
		"stateCode": "MA"
	},
	{
		"id": 2109601,
		"name": "Rosário",
		"stateCode": "MA"
	},
	{
		"id": 2109700,
		"name": "Sambaíba",
		"stateCode": "MA"
	},
	{
		"id": 2109759,
		"name": "Santa Filomena do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2109809,
		"name": "Santa Helena",
		"stateCode": "MA"
	},
	{
		"id": 2109908,
		"name": "Santa Inês",
		"stateCode": "MA"
	},
	{
		"id": 2110005,
		"name": "Santa Luzia",
		"stateCode": "MA"
	},
	{
		"id": 2110039,
		"name": "Santa Luzia do Paruá",
		"stateCode": "MA"
	},
	{
		"id": 2110104,
		"name": "Santa Quitéria do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2110203,
		"name": "Santa Rita",
		"stateCode": "MA"
	},
	{
		"id": 2110237,
		"name": "Santana do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2110278,
		"name": "Santo Amaro do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2110302,
		"name": "Santo Antônio dos Lopes",
		"stateCode": "MA"
	},
	{
		"id": 2110401,
		"name": "São Benedito do Rio Preto",
		"stateCode": "MA"
	},
	{
		"id": 2110500,
		"name": "São Bento",
		"stateCode": "MA"
	},
	{
		"id": 2110609,
		"name": "São Bernardo",
		"stateCode": "MA"
	},
	{
		"id": 2110658,
		"name": "São Domingos do Azeitão",
		"stateCode": "MA"
	},
	{
		"id": 2110708,
		"name": "São Domingos do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2110807,
		"name": "São Félix de Balsas",
		"stateCode": "MA"
	},
	{
		"id": 2110856,
		"name": "São Francisco do Brejão",
		"stateCode": "MA"
	},
	{
		"id": 2110906,
		"name": "São Francisco do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2111003,
		"name": "São João Batista",
		"stateCode": "MA"
	},
	{
		"id": 2111029,
		"name": "São João do Carú",
		"stateCode": "MA"
	},
	{
		"id": 2111052,
		"name": "São João do Paraíso",
		"stateCode": "MA"
	},
	{
		"id": 2111078,
		"name": "São João do Soter",
		"stateCode": "MA"
	},
	{
		"id": 2111102,
		"name": "São João dos Patos",
		"stateCode": "MA"
	},
	{
		"id": 2111201,
		"name": "São José de Ribamar",
		"stateCode": "MA"
	},
	{
		"id": 2111250,
		"name": "São José dos Basílios",
		"stateCode": "MA"
	},
	{
		"id": 2111300,
		"name": "São Luís",
		"stateCode": "MA"
	},
	{
		"id": 2111409,
		"name": "São Luís Gonzaga do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2111508,
		"name": "São Mateus do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2111532,
		"name": "São Pedro da Água Branca",
		"stateCode": "MA"
	},
	{
		"id": 2111573,
		"name": "São Pedro dos Crentes",
		"stateCode": "MA"
	},
	{
		"id": 2111607,
		"name": "São Raimundo das Mangabeiras",
		"stateCode": "MA"
	},
	{
		"id": 2111631,
		"name": "São Raimundo do Doca Bezerra",
		"stateCode": "MA"
	},
	{
		"id": 2111672,
		"name": "São Roberto",
		"stateCode": "MA"
	},
	{
		"id": 2111706,
		"name": "São Vicente Ferrer",
		"stateCode": "MA"
	},
	{
		"id": 2111722,
		"name": "Satubinha",
		"stateCode": "MA"
	},
	{
		"id": 2111748,
		"name": "Senador Alexandre Costa",
		"stateCode": "MA"
	},
	{
		"id": 2111763,
		"name": "Senador La Rocque",
		"stateCode": "MA"
	},
	{
		"id": 2111789,
		"name": "Serrano do Maranhão",
		"stateCode": "MA"
	},
	{
		"id": 2111805,
		"name": "Sítio Novo",
		"stateCode": "MA"
	},
	{
		"id": 2111904,
		"name": "Sucupira do Norte",
		"stateCode": "MA"
	},
	{
		"id": 2111953,
		"name": "Sucupira do Riachão",
		"stateCode": "MA"
	},
	{
		"id": 2112001,
		"name": "Tasso Fragoso",
		"stateCode": "MA"
	},
	{
		"id": 2112100,
		"name": "Timbiras",
		"stateCode": "MA"
	},
	{
		"id": 2112209,
		"name": "Timon",
		"stateCode": "MA"
	},
	{
		"id": 2112233,
		"name": "Trizidela do Vale",
		"stateCode": "MA"
	},
	{
		"id": 2112274,
		"name": "Tufilândia",
		"stateCode": "MA"
	},
	{
		"id": 2112308,
		"name": "Tuntum",
		"stateCode": "MA"
	},
	{
		"id": 2112407,
		"name": "Turiaçu",
		"stateCode": "MA"
	},
	{
		"id": 2112456,
		"name": "Turilândia",
		"stateCode": "MA"
	},
	{
		"id": 2112506,
		"name": "Tutóia",
		"stateCode": "MA"
	},
	{
		"id": 2112605,
		"name": "Urbano Santos",
		"stateCode": "MA"
	},
	{
		"id": 2112704,
		"name": "Vargem Grande",
		"stateCode": "MA"
	},
	{
		"id": 2112803,
		"name": "Viana",
		"stateCode": "MA"
	},
	{
		"id": 2112852,
		"name": "Vila Nova dos Martírios",
		"stateCode": "MA"
	},
	{
		"id": 2112902,
		"name": "Vitória do Mearim",
		"stateCode": "MA"
	},
	{
		"id": 2113009,
		"name": "Vitorino Freire",
		"stateCode": "MA"
	},
	{
		"id": 2114007,
		"name": "Zé Doca",
		"stateCode": "MA"
	},
	{
		"id": 3100104,
		"name": "Abadia dos Dourados",
		"stateCode": "MG"
	},
	{
		"id": 3100203,
		"name": "Abaeté",
		"stateCode": "MG"
	},
	{
		"id": 3100302,
		"name": "Abre Campo",
		"stateCode": "MG"
	},
	{
		"id": 3100401,
		"name": "Acaiaca",
		"stateCode": "MG"
	},
	{
		"id": 3100500,
		"name": "Açucena",
		"stateCode": "MG"
	},
	{
		"id": 3100609,
		"name": "Água Boa",
		"stateCode": "MG"
	},
	{
		"id": 3100708,
		"name": "Água Comprida",
		"stateCode": "MG"
	},
	{
		"id": 3100807,
		"name": "Aguanil",
		"stateCode": "MG"
	},
	{
		"id": 3100906,
		"name": "Águas Formosas",
		"stateCode": "MG"
	},
	{
		"id": 3101003,
		"name": "Águas Vermelhas",
		"stateCode": "MG"
	},
	{
		"id": 3101102,
		"name": "Aimorés",
		"stateCode": "MG"
	},
	{
		"id": 3101201,
		"name": "Aiuruoca",
		"stateCode": "MG"
	},
	{
		"id": 3101300,
		"name": "Alagoa",
		"stateCode": "MG"
	},
	{
		"id": 3101409,
		"name": "Albertina",
		"stateCode": "MG"
	},
	{
		"id": 3101508,
		"name": "Além Paraíba",
		"stateCode": "MG"
	},
	{
		"id": 3101607,
		"name": "Alfenas",
		"stateCode": "MG"
	},
	{
		"id": 3101631,
		"name": "Alfredo Vasconcelos",
		"stateCode": "MG"
	},
	{
		"id": 3101706,
		"name": "Almenara",
		"stateCode": "MG"
	},
	{
		"id": 3101805,
		"name": "Alpercata",
		"stateCode": "MG"
	},
	{
		"id": 3101904,
		"name": "Alpinópolis",
		"stateCode": "MG"
	},
	{
		"id": 3102001,
		"name": "Alterosa",
		"stateCode": "MG"
	},
	{
		"id": 3102050,
		"name": "Alto Caparaó",
		"stateCode": "MG"
	},
	{
		"id": 3153509,
		"name": "Alto Jequitibá",
		"stateCode": "MG"
	},
	{
		"id": 3102100,
		"name": "Alto Rio Doce",
		"stateCode": "MG"
	},
	{
		"id": 3102209,
		"name": "Alvarenga",
		"stateCode": "MG"
	},
	{
		"id": 3102308,
		"name": "Alvinópolis",
		"stateCode": "MG"
	},
	{
		"id": 3102407,
		"name": "Alvorada de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3102506,
		"name": "Amparo do Serra",
		"stateCode": "MG"
	},
	{
		"id": 3102605,
		"name": "Andradas",
		"stateCode": "MG"
	},
	{
		"id": 3102803,
		"name": "Andrelândia",
		"stateCode": "MG"
	},
	{
		"id": 3102852,
		"name": "Angelândia",
		"stateCode": "MG"
	},
	{
		"id": 3102902,
		"name": "Antônio Carlos",
		"stateCode": "MG"
	},
	{
		"id": 3103009,
		"name": "Antônio Dias",
		"stateCode": "MG"
	},
	{
		"id": 3103108,
		"name": "Antônio Prado de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3103207,
		"name": "Araçaí",
		"stateCode": "MG"
	},
	{
		"id": 3103306,
		"name": "Aracitaba",
		"stateCode": "MG"
	},
	{
		"id": 3103405,
		"name": "Araçuaí",
		"stateCode": "MG"
	},
	{
		"id": 3103504,
		"name": "Araguari",
		"stateCode": "MG"
	},
	{
		"id": 3103603,
		"name": "Arantina",
		"stateCode": "MG"
	},
	{
		"id": 3103702,
		"name": "Araponga",
		"stateCode": "MG"
	},
	{
		"id": 3103751,
		"name": "Araporã",
		"stateCode": "MG"
	},
	{
		"id": 3103801,
		"name": "Arapuá",
		"stateCode": "MG"
	},
	{
		"id": 3103900,
		"name": "Araújos",
		"stateCode": "MG"
	},
	{
		"id": 3104007,
		"name": "Araxá",
		"stateCode": "MG"
	},
	{
		"id": 3104106,
		"name": "Arceburgo",
		"stateCode": "MG"
	},
	{
		"id": 3104205,
		"name": "Arcos",
		"stateCode": "MG"
	},
	{
		"id": 3104304,
		"name": "Areado",
		"stateCode": "MG"
	},
	{
		"id": 3104403,
		"name": "Argirita",
		"stateCode": "MG"
	},
	{
		"id": 3104452,
		"name": "Aricanduva",
		"stateCode": "MG"
	},
	{
		"id": 3104502,
		"name": "Arinos",
		"stateCode": "MG"
	},
	{
		"id": 3104601,
		"name": "Astolfo Dutra",
		"stateCode": "MG"
	},
	{
		"id": 3104700,
		"name": "Ataléia",
		"stateCode": "MG"
	},
	{
		"id": 3104809,
		"name": "Augusto de Lima",
		"stateCode": "MG"
	},
	{
		"id": 3104908,
		"name": "Baependi",
		"stateCode": "MG"
	},
	{
		"id": 3105004,
		"name": "Baldim",
		"stateCode": "MG"
	},
	{
		"id": 3105103,
		"name": "Bambuí",
		"stateCode": "MG"
	},
	{
		"id": 3105202,
		"name": "Bandeira",
		"stateCode": "MG"
	},
	{
		"id": 3105301,
		"name": "Bandeira do Sul",
		"stateCode": "MG"
	},
	{
		"id": 3105400,
		"name": "Barão de Cocais",
		"stateCode": "MG"
	},
	{
		"id": 3105509,
		"name": "Barão do Monte Alto",
		"stateCode": "MG"
	},
	{
		"id": 3105608,
		"name": "Barbacena",
		"stateCode": "MG"
	},
	{
		"id": 3105707,
		"name": "Barra Longa",
		"stateCode": "MG"
	},
	{
		"id": 3105905,
		"name": "Barroso",
		"stateCode": "MG"
	},
	{
		"id": 3106002,
		"name": "Bela Vista de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3106101,
		"name": "Belmiro Braga",
		"stateCode": "MG"
	},
	{
		"id": 3106200,
		"name": "Belo Horizonte",
		"stateCode": "MG"
	},
	{
		"id": 3106309,
		"name": "Belo Oriente",
		"stateCode": "MG"
	},
	{
		"id": 3106408,
		"name": "Belo Vale",
		"stateCode": "MG"
	},
	{
		"id": 3106507,
		"name": "Berilo",
		"stateCode": "MG"
	},
	{
		"id": 3106655,
		"name": "Berizal",
		"stateCode": "MG"
	},
	{
		"id": 3106606,
		"name": "Bertópolis",
		"stateCode": "MG"
	},
	{
		"id": 3106705,
		"name": "Betim",
		"stateCode": "MG"
	},
	{
		"id": 3106804,
		"name": "Bias Fortes",
		"stateCode": "MG"
	},
	{
		"id": 3106903,
		"name": "Bicas",
		"stateCode": "MG"
	},
	{
		"id": 3107000,
		"name": "Biquinhas",
		"stateCode": "MG"
	},
	{
		"id": 3107109,
		"name": "Boa Esperança",
		"stateCode": "MG"
	},
	{
		"id": 3107208,
		"name": "Bocaina de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3107307,
		"name": "Bocaiúva",
		"stateCode": "MG"
	},
	{
		"id": 3107406,
		"name": "Bom Despacho",
		"stateCode": "MG"
	},
	{
		"id": 3107505,
		"name": "Bom Jardim de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3107604,
		"name": "Bom Jesus da Penha",
		"stateCode": "MG"
	},
	{
		"id": 3107703,
		"name": "Bom Jesus do Amparo",
		"stateCode": "MG"
	},
	{
		"id": 3107802,
		"name": "Bom Jesus do Galho",
		"stateCode": "MG"
	},
	{
		"id": 3107901,
		"name": "Bom Repouso",
		"stateCode": "MG"
	},
	{
		"id": 3108008,
		"name": "Bom Sucesso",
		"stateCode": "MG"
	},
	{
		"id": 3108107,
		"name": "Bonfim",
		"stateCode": "MG"
	},
	{
		"id": 3108206,
		"name": "Bonfinópolis de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3108255,
		"name": "Bonito de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3108305,
		"name": "Borda da Mata",
		"stateCode": "MG"
	},
	{
		"id": 3108404,
		"name": "Botelhos",
		"stateCode": "MG"
	},
	{
		"id": 3108503,
		"name": "Botumirim",
		"stateCode": "MG"
	},
	{
		"id": 3108701,
		"name": "Brás Pires",
		"stateCode": "MG"
	},
	{
		"id": 3108552,
		"name": "Brasilândia de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3108602,
		"name": "Brasília de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3108800,
		"name": "Braúnas",
		"stateCode": "MG"
	},
	{
		"id": 3108909,
		"name": "Brazópolis",
		"stateCode": "MG"
	},
	{
		"id": 3109006,
		"name": "Brumadinho",
		"stateCode": "MG"
	},
	{
		"id": 3109105,
		"name": "Bueno Brandão",
		"stateCode": "MG"
	},
	{
		"id": 3109204,
		"name": "Buenópolis",
		"stateCode": "MG"
	},
	{
		"id": 3109253,
		"name": "Bugre",
		"stateCode": "MG"
	},
	{
		"id": 3109303,
		"name": "Buritis",
		"stateCode": "MG"
	},
	{
		"id": 3109402,
		"name": "Buritizeiro",
		"stateCode": "MG"
	},
	{
		"id": 3109451,
		"name": "Cabeceira Grande",
		"stateCode": "MG"
	},
	{
		"id": 3109501,
		"name": "Cabo Verde",
		"stateCode": "MG"
	},
	{
		"id": 3109600,
		"name": "Cachoeira da Prata",
		"stateCode": "MG"
	},
	{
		"id": 3109709,
		"name": "Cachoeira de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3102704,
		"name": "Cachoeira de Pajeú",
		"stateCode": "MG"
	},
	{
		"id": 3109808,
		"name": "Cachoeira Dourada",
		"stateCode": "MG"
	},
	{
		"id": 3109907,
		"name": "Caetanópolis",
		"stateCode": "MG"
	},
	{
		"id": 3110004,
		"name": "Caeté",
		"stateCode": "MG"
	},
	{
		"id": 3110103,
		"name": "Caiana",
		"stateCode": "MG"
	},
	{
		"id": 3110202,
		"name": "Cajuri",
		"stateCode": "MG"
	},
	{
		"id": 3110301,
		"name": "Caldas",
		"stateCode": "MG"
	},
	{
		"id": 3110400,
		"name": "Camacho",
		"stateCode": "MG"
	},
	{
		"id": 3110509,
		"name": "Camanducaia",
		"stateCode": "MG"
	},
	{
		"id": 3110608,
		"name": "Cambuí",
		"stateCode": "MG"
	},
	{
		"id": 3110707,
		"name": "Cambuquira",
		"stateCode": "MG"
	},
	{
		"id": 3110806,
		"name": "Campanário",
		"stateCode": "MG"
	},
	{
		"id": 3110905,
		"name": "Campanha",
		"stateCode": "MG"
	},
	{
		"id": 3111002,
		"name": "Campestre",
		"stateCode": "MG"
	},
	{
		"id": 3111101,
		"name": "Campina Verde",
		"stateCode": "MG"
	},
	{
		"id": 3111150,
		"name": "Campo Azul",
		"stateCode": "MG"
	},
	{
		"id": 3111200,
		"name": "Campo Belo",
		"stateCode": "MG"
	},
	{
		"id": 3111309,
		"name": "Campo do Meio",
		"stateCode": "MG"
	},
	{
		"id": 3111408,
		"name": "Campo Florido",
		"stateCode": "MG"
	},
	{
		"id": 3111507,
		"name": "Campos Altos",
		"stateCode": "MG"
	},
	{
		"id": 3111606,
		"name": "Campos Gerais",
		"stateCode": "MG"
	},
	{
		"id": 3111903,
		"name": "Cana Verde",
		"stateCode": "MG"
	},
	{
		"id": 3111705,
		"name": "Canaã",
		"stateCode": "MG"
	},
	{
		"id": 3111804,
		"name": "Canápolis",
		"stateCode": "MG"
	},
	{
		"id": 3112000,
		"name": "Candeias",
		"stateCode": "MG"
	},
	{
		"id": 3112059,
		"name": "Cantagalo",
		"stateCode": "MG"
	},
	{
		"id": 3112109,
		"name": "Caparaó",
		"stateCode": "MG"
	},
	{
		"id": 3112208,
		"name": "Capela Nova",
		"stateCode": "MG"
	},
	{
		"id": 3112307,
		"name": "Capelinha",
		"stateCode": "MG"
	},
	{
		"id": 3112406,
		"name": "Capetinga",
		"stateCode": "MG"
	},
	{
		"id": 3112505,
		"name": "Capim Branco",
		"stateCode": "MG"
	},
	{
		"id": 3112604,
		"name": "Capinópolis",
		"stateCode": "MG"
	},
	{
		"id": 3112653,
		"name": "Capitão Andrade",
		"stateCode": "MG"
	},
	{
		"id": 3112703,
		"name": "Capitão Enéas",
		"stateCode": "MG"
	},
	{
		"id": 3112802,
		"name": "Capitólio",
		"stateCode": "MG"
	},
	{
		"id": 3112901,
		"name": "Caputira",
		"stateCode": "MG"
	},
	{
		"id": 3113008,
		"name": "Caraí",
		"stateCode": "MG"
	},
	{
		"id": 3113107,
		"name": "Caranaíba",
		"stateCode": "MG"
	},
	{
		"id": 3113206,
		"name": "Carandaí",
		"stateCode": "MG"
	},
	{
		"id": 3113305,
		"name": "Carangola",
		"stateCode": "MG"
	},
	{
		"id": 3113404,
		"name": "Caratinga",
		"stateCode": "MG"
	},
	{
		"id": 3113503,
		"name": "Carbonita",
		"stateCode": "MG"
	},
	{
		"id": 3113602,
		"name": "Careaçu",
		"stateCode": "MG"
	},
	{
		"id": 3113701,
		"name": "Carlos Chagas",
		"stateCode": "MG"
	},
	{
		"id": 3113800,
		"name": "Carmésia",
		"stateCode": "MG"
	},
	{
		"id": 3113909,
		"name": "Carmo da Cachoeira",
		"stateCode": "MG"
	},
	{
		"id": 3114006,
		"name": "Carmo da Mata",
		"stateCode": "MG"
	},
	{
		"id": 3114105,
		"name": "Carmo de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3114204,
		"name": "Carmo do Cajuru",
		"stateCode": "MG"
	},
	{
		"id": 3114303,
		"name": "Carmo do Paranaíba",
		"stateCode": "MG"
	},
	{
		"id": 3114402,
		"name": "Carmo do Rio Claro",
		"stateCode": "MG"
	},
	{
		"id": 3114501,
		"name": "Carmópolis de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3114550,
		"name": "Carneirinho",
		"stateCode": "MG"
	},
	{
		"id": 3114600,
		"name": "Carrancas",
		"stateCode": "MG"
	},
	{
		"id": 3114709,
		"name": "Carvalhópolis",
		"stateCode": "MG"
	},
	{
		"id": 3114808,
		"name": "Carvalhos",
		"stateCode": "MG"
	},
	{
		"id": 3114907,
		"name": "Casa Grande",
		"stateCode": "MG"
	},
	{
		"id": 3115003,
		"name": "Cascalho Rico",
		"stateCode": "MG"
	},
	{
		"id": 3115102,
		"name": "Cássia",
		"stateCode": "MG"
	},
	{
		"id": 3115300,
		"name": "Cataguases",
		"stateCode": "MG"
	},
	{
		"id": 3115359,
		"name": "Catas Altas",
		"stateCode": "MG"
	},
	{
		"id": 3115409,
		"name": "Catas Altas da Noruega",
		"stateCode": "MG"
	},
	{
		"id": 3115458,
		"name": "Catuji",
		"stateCode": "MG"
	},
	{
		"id": 3115474,
		"name": "Catuti",
		"stateCode": "MG"
	},
	{
		"id": 3115508,
		"name": "Caxambu",
		"stateCode": "MG"
	},
	{
		"id": 3115607,
		"name": "Cedro do Abaeté",
		"stateCode": "MG"
	},
	{
		"id": 3115706,
		"name": "Central de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3115805,
		"name": "Centralina",
		"stateCode": "MG"
	},
	{
		"id": 3115904,
		"name": "Chácara",
		"stateCode": "MG"
	},
	{
		"id": 3116001,
		"name": "Chalé",
		"stateCode": "MG"
	},
	{
		"id": 3116100,
		"name": "Chapada do Norte",
		"stateCode": "MG"
	},
	{
		"id": 3116159,
		"name": "Chapada Gaúcha",
		"stateCode": "MG"
	},
	{
		"id": 3116209,
		"name": "Chiador",
		"stateCode": "MG"
	},
	{
		"id": 3116308,
		"name": "Cipotânea",
		"stateCode": "MG"
	},
	{
		"id": 3116407,
		"name": "Claraval",
		"stateCode": "MG"
	},
	{
		"id": 3116506,
		"name": "Claro dos Poções",
		"stateCode": "MG"
	},
	{
		"id": 3116605,
		"name": "Cláudio",
		"stateCode": "MG"
	},
	{
		"id": 3116704,
		"name": "Coimbra",
		"stateCode": "MG"
	},
	{
		"id": 3116803,
		"name": "Coluna",
		"stateCode": "MG"
	},
	{
		"id": 3116902,
		"name": "Comendador Gomes",
		"stateCode": "MG"
	},
	{
		"id": 3117009,
		"name": "Comercinho",
		"stateCode": "MG"
	},
	{
		"id": 3117108,
		"name": "Conceição da Aparecida",
		"stateCode": "MG"
	},
	{
		"id": 3115201,
		"name": "Conceição da Barra de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3117306,
		"name": "Conceição das Alagoas",
		"stateCode": "MG"
	},
	{
		"id": 3117207,
		"name": "Conceição das Pedras",
		"stateCode": "MG"
	},
	{
		"id": 3117405,
		"name": "Conceição de Ipanema",
		"stateCode": "MG"
	},
	{
		"id": 3117504,
		"name": "Conceição do Mato Dentro",
		"stateCode": "MG"
	},
	{
		"id": 3117603,
		"name": "Conceição do Pará",
		"stateCode": "MG"
	},
	{
		"id": 3117702,
		"name": "Conceição do Rio Verde",
		"stateCode": "MG"
	},
	{
		"id": 3117801,
		"name": "Conceição dos Ouros",
		"stateCode": "MG"
	},
	{
		"id": 3117836,
		"name": "Cônego Marinho",
		"stateCode": "MG"
	},
	{
		"id": 3117876,
		"name": "Confins",
		"stateCode": "MG"
	},
	{
		"id": 3117900,
		"name": "Congonhal",
		"stateCode": "MG"
	},
	{
		"id": 3118007,
		"name": "Congonhas",
		"stateCode": "MG"
	},
	{
		"id": 3118106,
		"name": "Congonhas do Norte",
		"stateCode": "MG"
	},
	{
		"id": 3118205,
		"name": "Conquista",
		"stateCode": "MG"
	},
	{
		"id": 3118304,
		"name": "Conselheiro Lafaiete",
		"stateCode": "MG"
	},
	{
		"id": 3118403,
		"name": "Conselheiro Pena",
		"stateCode": "MG"
	},
	{
		"id": 3118502,
		"name": "Consolação",
		"stateCode": "MG"
	},
	{
		"id": 3118601,
		"name": "Contagem",
		"stateCode": "MG"
	},
	{
		"id": 3118700,
		"name": "Coqueiral",
		"stateCode": "MG"
	},
	{
		"id": 3118809,
		"name": "Coração de Jesus",
		"stateCode": "MG"
	},
	{
		"id": 3118908,
		"name": "Cordisburgo",
		"stateCode": "MG"
	},
	{
		"id": 3119005,
		"name": "Cordislândia",
		"stateCode": "MG"
	},
	{
		"id": 3119104,
		"name": "Corinto",
		"stateCode": "MG"
	},
	{
		"id": 3119203,
		"name": "Coroaci",
		"stateCode": "MG"
	},
	{
		"id": 3119302,
		"name": "Coromandel",
		"stateCode": "MG"
	},
	{
		"id": 3119401,
		"name": "Coronel Fabriciano",
		"stateCode": "MG"
	},
	{
		"id": 3119500,
		"name": "Coronel Murta",
		"stateCode": "MG"
	},
	{
		"id": 3119609,
		"name": "Coronel Pacheco",
		"stateCode": "MG"
	},
	{
		"id": 3119708,
		"name": "Coronel Xavier Chaves",
		"stateCode": "MG"
	},
	{
		"id": 3119807,
		"name": "Córrego Danta",
		"stateCode": "MG"
	},
	{
		"id": 3119906,
		"name": "Córrego do Bom Jesus",
		"stateCode": "MG"
	},
	{
		"id": 3119955,
		"name": "Córrego Fundo",
		"stateCode": "MG"
	},
	{
		"id": 3120003,
		"name": "Córrego Novo",
		"stateCode": "MG"
	},
	{
		"id": 3120102,
		"name": "Couto de Magalhães de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3120151,
		"name": "Crisólita",
		"stateCode": "MG"
	},
	{
		"id": 3120201,
		"name": "Cristais",
		"stateCode": "MG"
	},
	{
		"id": 3120300,
		"name": "Cristália",
		"stateCode": "MG"
	},
	{
		"id": 3120409,
		"name": "Cristiano Otoni",
		"stateCode": "MG"
	},
	{
		"id": 3120508,
		"name": "Cristina",
		"stateCode": "MG"
	},
	{
		"id": 3120607,
		"name": "Crucilândia",
		"stateCode": "MG"
	},
	{
		"id": 3120706,
		"name": "Cruzeiro da Fortaleza",
		"stateCode": "MG"
	},
	{
		"id": 3120805,
		"name": "Cruzília",
		"stateCode": "MG"
	},
	{
		"id": 3120839,
		"name": "Cuparaque",
		"stateCode": "MG"
	},
	{
		"id": 3120870,
		"name": "Curral de Dentro",
		"stateCode": "MG"
	},
	{
		"id": 3120904,
		"name": "Curvelo",
		"stateCode": "MG"
	},
	{
		"id": 3121001,
		"name": "Datas",
		"stateCode": "MG"
	},
	{
		"id": 3121100,
		"name": "Delfim Moreira",
		"stateCode": "MG"
	},
	{
		"id": 3121209,
		"name": "Delfinópolis",
		"stateCode": "MG"
	},
	{
		"id": 3121258,
		"name": "Delta",
		"stateCode": "MG"
	},
	{
		"id": 3121308,
		"name": "Descoberto",
		"stateCode": "MG"
	},
	{
		"id": 3121407,
		"name": "Desterro de Entre Rios",
		"stateCode": "MG"
	},
	{
		"id": 3121506,
		"name": "Desterro do Melo",
		"stateCode": "MG"
	},
	{
		"id": 3121605,
		"name": "Diamantina",
		"stateCode": "MG"
	},
	{
		"id": 3121704,
		"name": "Diogo de Vasconcelos",
		"stateCode": "MG"
	},
	{
		"id": 3121803,
		"name": "Dionísio",
		"stateCode": "MG"
	},
	{
		"id": 3121902,
		"name": "Divinésia",
		"stateCode": "MG"
	},
	{
		"id": 3122009,
		"name": "Divino",
		"stateCode": "MG"
	},
	{
		"id": 3122108,
		"name": "Divino das Laranjeiras",
		"stateCode": "MG"
	},
	{
		"id": 3122207,
		"name": "Divinolândia de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3122306,
		"name": "Divinópolis",
		"stateCode": "MG"
	},
	{
		"id": 3122355,
		"name": "Divisa Alegre",
		"stateCode": "MG"
	},
	{
		"id": 3122405,
		"name": "Divisa Nova",
		"stateCode": "MG"
	},
	{
		"id": 3122454,
		"name": "Divisópolis",
		"stateCode": "MG"
	},
	{
		"id": 3122470,
		"name": "Dom Bosco",
		"stateCode": "MG"
	},
	{
		"id": 3122504,
		"name": "Dom Cavati",
		"stateCode": "MG"
	},
	{
		"id": 3122603,
		"name": "Dom Joaquim",
		"stateCode": "MG"
	},
	{
		"id": 3122702,
		"name": "Dom Silvério",
		"stateCode": "MG"
	},
	{
		"id": 3122801,
		"name": "Dom Viçoso",
		"stateCode": "MG"
	},
	{
		"id": 3122900,
		"name": "Dona Euzébia",
		"stateCode": "MG"
	},
	{
		"id": 3123007,
		"name": "Dores de Campos",
		"stateCode": "MG"
	},
	{
		"id": 3123106,
		"name": "Dores de Guanhães",
		"stateCode": "MG"
	},
	{
		"id": 3123205,
		"name": "Dores do Indaiá",
		"stateCode": "MG"
	},
	{
		"id": 3123304,
		"name": "Dores do Turvo",
		"stateCode": "MG"
	},
	{
		"id": 3123403,
		"name": "Doresópolis",
		"stateCode": "MG"
	},
	{
		"id": 3123502,
		"name": "Douradoquara",
		"stateCode": "MG"
	},
	{
		"id": 3123528,
		"name": "Durandé",
		"stateCode": "MG"
	},
	{
		"id": 3123601,
		"name": "Elói Mendes",
		"stateCode": "MG"
	},
	{
		"id": 3123700,
		"name": "Engenheiro Caldas",
		"stateCode": "MG"
	},
	{
		"id": 3123809,
		"name": "Engenheiro Navarro",
		"stateCode": "MG"
	},
	{
		"id": 3123858,
		"name": "Entre Folhas",
		"stateCode": "MG"
	},
	{
		"id": 3123908,
		"name": "Entre Rios de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3124005,
		"name": "Ervália",
		"stateCode": "MG"
	},
	{
		"id": 3124104,
		"name": "Esmeraldas",
		"stateCode": "MG"
	},
	{
		"id": 3124203,
		"name": "Espera Feliz",
		"stateCode": "MG"
	},
	{
		"id": 3124302,
		"name": "Espinosa",
		"stateCode": "MG"
	},
	{
		"id": 3124401,
		"name": "Espírito Santo do Dourado",
		"stateCode": "MG"
	},
	{
		"id": 3124500,
		"name": "Estiva",
		"stateCode": "MG"
	},
	{
		"id": 3124609,
		"name": "Estrela Dalva",
		"stateCode": "MG"
	},
	{
		"id": 3124708,
		"name": "Estrela do Indaiá",
		"stateCode": "MG"
	},
	{
		"id": 3124807,
		"name": "Estrela do Sul",
		"stateCode": "MG"
	},
	{
		"id": 3124906,
		"name": "Eugenópolis",
		"stateCode": "MG"
	},
	{
		"id": 3125002,
		"name": "Ewbank da Câmara",
		"stateCode": "MG"
	},
	{
		"id": 3125101,
		"name": "Extrema",
		"stateCode": "MG"
	},
	{
		"id": 3125200,
		"name": "Fama",
		"stateCode": "MG"
	},
	{
		"id": 3125309,
		"name": "Faria Lemos",
		"stateCode": "MG"
	},
	{
		"id": 3125408,
		"name": "Felício dos Santos",
		"stateCode": "MG"
	},
	{
		"id": 3125606,
		"name": "Felisburgo",
		"stateCode": "MG"
	},
	{
		"id": 3125705,
		"name": "Felixlândia",
		"stateCode": "MG"
	},
	{
		"id": 3125804,
		"name": "Fernandes Tourinho",
		"stateCode": "MG"
	},
	{
		"id": 3125903,
		"name": "Ferros",
		"stateCode": "MG"
	},
	{
		"id": 3125952,
		"name": "Fervedouro",
		"stateCode": "MG"
	},
	{
		"id": 3126000,
		"name": "Florestal",
		"stateCode": "MG"
	},
	{
		"id": 3126109,
		"name": "Formiga",
		"stateCode": "MG"
	},
	{
		"id": 3126208,
		"name": "Formoso",
		"stateCode": "MG"
	},
	{
		"id": 3126307,
		"name": "Fortaleza de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3126406,
		"name": "Fortuna de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3126505,
		"name": "Francisco Badaró",
		"stateCode": "MG"
	},
	{
		"id": 3126604,
		"name": "Francisco Dumont",
		"stateCode": "MG"
	},
	{
		"id": 3126703,
		"name": "Francisco Sá",
		"stateCode": "MG"
	},
	{
		"id": 3126752,
		"name": "Franciscópolis",
		"stateCode": "MG"
	},
	{
		"id": 3126802,
		"name": "Frei Gaspar",
		"stateCode": "MG"
	},
	{
		"id": 3126901,
		"name": "Frei Inocêncio",
		"stateCode": "MG"
	},
	{
		"id": 3126950,
		"name": "Frei Lagonegro",
		"stateCode": "MG"
	},
	{
		"id": 3127008,
		"name": "Fronteira",
		"stateCode": "MG"
	},
	{
		"id": 3127057,
		"name": "Fronteira dos Vales",
		"stateCode": "MG"
	},
	{
		"id": 3127073,
		"name": "Fruta de Leite",
		"stateCode": "MG"
	},
	{
		"id": 3127107,
		"name": "Frutal",
		"stateCode": "MG"
	},
	{
		"id": 3127206,
		"name": "Funilândia",
		"stateCode": "MG"
	},
	{
		"id": 3127305,
		"name": "Galiléia",
		"stateCode": "MG"
	},
	{
		"id": 3127339,
		"name": "Gameleiras",
		"stateCode": "MG"
	},
	{
		"id": 3127354,
		"name": "Glaucilândia",
		"stateCode": "MG"
	},
	{
		"id": 3127370,
		"name": "Goiabeira",
		"stateCode": "MG"
	},
	{
		"id": 3127388,
		"name": "Goianá",
		"stateCode": "MG"
	},
	{
		"id": 3127404,
		"name": "Gonçalves",
		"stateCode": "MG"
	},
	{
		"id": 3127503,
		"name": "Gonzaga",
		"stateCode": "MG"
	},
	{
		"id": 3127602,
		"name": "Gouveia",
		"stateCode": "MG"
	},
	{
		"id": 3127701,
		"name": "Governador Valadares",
		"stateCode": "MG"
	},
	{
		"id": 3127800,
		"name": "Grão Mogol",
		"stateCode": "MG"
	},
	{
		"id": 3127909,
		"name": "Grupiara",
		"stateCode": "MG"
	},
	{
		"id": 3128006,
		"name": "Guanhães",
		"stateCode": "MG"
	},
	{
		"id": 3128105,
		"name": "Guapé",
		"stateCode": "MG"
	},
	{
		"id": 3128204,
		"name": "Guaraciaba",
		"stateCode": "MG"
	},
	{
		"id": 3128253,
		"name": "Guaraciama",
		"stateCode": "MG"
	},
	{
		"id": 3128303,
		"name": "Guaranésia",
		"stateCode": "MG"
	},
	{
		"id": 3128402,
		"name": "Guarani",
		"stateCode": "MG"
	},
	{
		"id": 3128501,
		"name": "Guarará",
		"stateCode": "MG"
	},
	{
		"id": 3128600,
		"name": "Guarda-Mor",
		"stateCode": "MG"
	},
	{
		"id": 3128709,
		"name": "Guaxupé",
		"stateCode": "MG"
	},
	{
		"id": 3128808,
		"name": "Guidoval",
		"stateCode": "MG"
	},
	{
		"id": 3128907,
		"name": "Guimarânia",
		"stateCode": "MG"
	},
	{
		"id": 3129004,
		"name": "Guiricema",
		"stateCode": "MG"
	},
	{
		"id": 3129103,
		"name": "Gurinhatã",
		"stateCode": "MG"
	},
	{
		"id": 3129202,
		"name": "Heliodora",
		"stateCode": "MG"
	},
	{
		"id": 3129301,
		"name": "Iapu",
		"stateCode": "MG"
	},
	{
		"id": 3129400,
		"name": "Ibertioga",
		"stateCode": "MG"
	},
	{
		"id": 3129509,
		"name": "Ibiá",
		"stateCode": "MG"
	},
	{
		"id": 3129608,
		"name": "Ibiaí",
		"stateCode": "MG"
	},
	{
		"id": 3129657,
		"name": "Ibiracatu",
		"stateCode": "MG"
	},
	{
		"id": 3129707,
		"name": "Ibiraci",
		"stateCode": "MG"
	},
	{
		"id": 3129806,
		"name": "Ibirité",
		"stateCode": "MG"
	},
	{
		"id": 3129905,
		"name": "Ibitiúra de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3130002,
		"name": "Ibituruna",
		"stateCode": "MG"
	},
	{
		"id": 3130051,
		"name": "Icaraí de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3130101,
		"name": "Igarapé",
		"stateCode": "MG"
	},
	{
		"id": 3130200,
		"name": "Igaratinga",
		"stateCode": "MG"
	},
	{
		"id": 3130309,
		"name": "Iguatama",
		"stateCode": "MG"
	},
	{
		"id": 3130408,
		"name": "Ijaci",
		"stateCode": "MG"
	},
	{
		"id": 3130507,
		"name": "Ilicínea",
		"stateCode": "MG"
	},
	{
		"id": 3130556,
		"name": "Imbé de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3130606,
		"name": "Inconfidentes",
		"stateCode": "MG"
	},
	{
		"id": 3130655,
		"name": "Indaiabira",
		"stateCode": "MG"
	},
	{
		"id": 3130705,
		"name": "Indianópolis",
		"stateCode": "MG"
	},
	{
		"id": 3130804,
		"name": "Ingaí",
		"stateCode": "MG"
	},
	{
		"id": 3130903,
		"name": "Inhapim",
		"stateCode": "MG"
	},
	{
		"id": 3131000,
		"name": "Inhaúma",
		"stateCode": "MG"
	},
	{
		"id": 3131109,
		"name": "Inimutaba",
		"stateCode": "MG"
	},
	{
		"id": 3131158,
		"name": "Ipaba",
		"stateCode": "MG"
	},
	{
		"id": 3131208,
		"name": "Ipanema",
		"stateCode": "MG"
	},
	{
		"id": 3131307,
		"name": "Ipatinga",
		"stateCode": "MG"
	},
	{
		"id": 3131406,
		"name": "Ipiaçu",
		"stateCode": "MG"
	},
	{
		"id": 3131505,
		"name": "Ipuiúna",
		"stateCode": "MG"
	},
	{
		"id": 3131604,
		"name": "Iraí de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3131703,
		"name": "Itabira",
		"stateCode": "MG"
	},
	{
		"id": 3131802,
		"name": "Itabirinha",
		"stateCode": "MG"
	},
	{
		"id": 3131901,
		"name": "Itabirito",
		"stateCode": "MG"
	},
	{
		"id": 3132008,
		"name": "Itacambira",
		"stateCode": "MG"
	},
	{
		"id": 3132107,
		"name": "Itacarambi",
		"stateCode": "MG"
	},
	{
		"id": 3132206,
		"name": "Itaguara",
		"stateCode": "MG"
	},
	{
		"id": 3132305,
		"name": "Itaipé",
		"stateCode": "MG"
	},
	{
		"id": 3132404,
		"name": "Itajubá",
		"stateCode": "MG"
	},
	{
		"id": 3132503,
		"name": "Itamarandiba",
		"stateCode": "MG"
	},
	{
		"id": 3132602,
		"name": "Itamarati de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3132701,
		"name": "Itambacuri",
		"stateCode": "MG"
	},
	{
		"id": 3132800,
		"name": "Itambé do Mato Dentro",
		"stateCode": "MG"
	},
	{
		"id": 3132909,
		"name": "Itamogi",
		"stateCode": "MG"
	},
	{
		"id": 3133006,
		"name": "Itamonte",
		"stateCode": "MG"
	},
	{
		"id": 3133105,
		"name": "Itanhandu",
		"stateCode": "MG"
	},
	{
		"id": 3133204,
		"name": "Itanhomi",
		"stateCode": "MG"
	},
	{
		"id": 3133303,
		"name": "Itaobim",
		"stateCode": "MG"
	},
	{
		"id": 3133402,
		"name": "Itapagipe",
		"stateCode": "MG"
	},
	{
		"id": 3133501,
		"name": "Itapecerica",
		"stateCode": "MG"
	},
	{
		"id": 3133600,
		"name": "Itapeva",
		"stateCode": "MG"
	},
	{
		"id": 3133709,
		"name": "Itatiaiuçu",
		"stateCode": "MG"
	},
	{
		"id": 3133758,
		"name": "Itaú de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3133808,
		"name": "Itaúna",
		"stateCode": "MG"
	},
	{
		"id": 3133907,
		"name": "Itaverava",
		"stateCode": "MG"
	},
	{
		"id": 3134004,
		"name": "Itinga",
		"stateCode": "MG"
	},
	{
		"id": 3134103,
		"name": "Itueta",
		"stateCode": "MG"
	},
	{
		"id": 3134202,
		"name": "Ituiutaba",
		"stateCode": "MG"
	},
	{
		"id": 3134301,
		"name": "Itumirim",
		"stateCode": "MG"
	},
	{
		"id": 3134400,
		"name": "Iturama",
		"stateCode": "MG"
	},
	{
		"id": 3134509,
		"name": "Itutinga",
		"stateCode": "MG"
	},
	{
		"id": 3134608,
		"name": "Jaboticatubas",
		"stateCode": "MG"
	},
	{
		"id": 3134707,
		"name": "Jacinto",
		"stateCode": "MG"
	},
	{
		"id": 3134806,
		"name": "Jacuí",
		"stateCode": "MG"
	},
	{
		"id": 3134905,
		"name": "Jacutinga",
		"stateCode": "MG"
	},
	{
		"id": 3135001,
		"name": "Jaguaraçu",
		"stateCode": "MG"
	},
	{
		"id": 3135050,
		"name": "Jaíba",
		"stateCode": "MG"
	},
	{
		"id": 3135076,
		"name": "Jampruca",
		"stateCode": "MG"
	},
	{
		"id": 3135100,
		"name": "Janaúba",
		"stateCode": "MG"
	},
	{
		"id": 3135209,
		"name": "Januária",
		"stateCode": "MG"
	},
	{
		"id": 3135308,
		"name": "Japaraíba",
		"stateCode": "MG"
	},
	{
		"id": 3135357,
		"name": "Japonvar",
		"stateCode": "MG"
	},
	{
		"id": 3135407,
		"name": "Jeceaba",
		"stateCode": "MG"
	},
	{
		"id": 3135456,
		"name": "Jenipapo de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3135506,
		"name": "Jequeri",
		"stateCode": "MG"
	},
	{
		"id": 3135605,
		"name": "Jequitaí",
		"stateCode": "MG"
	},
	{
		"id": 3135704,
		"name": "Jequitibá",
		"stateCode": "MG"
	},
	{
		"id": 3135803,
		"name": "Jequitinhonha",
		"stateCode": "MG"
	},
	{
		"id": 3135902,
		"name": "Jesuânia",
		"stateCode": "MG"
	},
	{
		"id": 3136009,
		"name": "Joaíma",
		"stateCode": "MG"
	},
	{
		"id": 3136108,
		"name": "Joanésia",
		"stateCode": "MG"
	},
	{
		"id": 3136207,
		"name": "João Monlevade",
		"stateCode": "MG"
	},
	{
		"id": 3136306,
		"name": "João Pinheiro",
		"stateCode": "MG"
	},
	{
		"id": 3136405,
		"name": "Joaquim Felício",
		"stateCode": "MG"
	},
	{
		"id": 3136504,
		"name": "Jordânia",
		"stateCode": "MG"
	},
	{
		"id": 3136520,
		"name": "José Gonçalves de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3136553,
		"name": "José Raydan",
		"stateCode": "MG"
	},
	{
		"id": 3136579,
		"name": "Josenópolis",
		"stateCode": "MG"
	},
	{
		"id": 3136652,
		"name": "Juatuba",
		"stateCode": "MG"
	},
	{
		"id": 3136702,
		"name": "Juiz de Fora",
		"stateCode": "MG"
	},
	{
		"id": 3136801,
		"name": "Juramento",
		"stateCode": "MG"
	},
	{
		"id": 3136900,
		"name": "Juruaia",
		"stateCode": "MG"
	},
	{
		"id": 3136959,
		"name": "Juvenília",
		"stateCode": "MG"
	},
	{
		"id": 3137007,
		"name": "Ladainha",
		"stateCode": "MG"
	},
	{
		"id": 3137106,
		"name": "Lagamar",
		"stateCode": "MG"
	},
	{
		"id": 3137205,
		"name": "Lagoa da Prata",
		"stateCode": "MG"
	},
	{
		"id": 3137304,
		"name": "Lagoa dos Patos",
		"stateCode": "MG"
	},
	{
		"id": 3137403,
		"name": "Lagoa Dourada",
		"stateCode": "MG"
	},
	{
		"id": 3137502,
		"name": "Lagoa Formosa",
		"stateCode": "MG"
	},
	{
		"id": 3137536,
		"name": "Lagoa Grande",
		"stateCode": "MG"
	},
	{
		"id": 3137601,
		"name": "Lagoa Santa",
		"stateCode": "MG"
	},
	{
		"id": 3137700,
		"name": "Lajinha",
		"stateCode": "MG"
	},
	{
		"id": 3137809,
		"name": "Lambari",
		"stateCode": "MG"
	},
	{
		"id": 3137908,
		"name": "Lamim",
		"stateCode": "MG"
	},
	{
		"id": 3138005,
		"name": "Laranjal",
		"stateCode": "MG"
	},
	{
		"id": 3138104,
		"name": "Lassance",
		"stateCode": "MG"
	},
	{
		"id": 3138203,
		"name": "Lavras",
		"stateCode": "MG"
	},
	{
		"id": 3138302,
		"name": "Leandro Ferreira",
		"stateCode": "MG"
	},
	{
		"id": 3138351,
		"name": "Leme do Prado",
		"stateCode": "MG"
	},
	{
		"id": 3138401,
		"name": "Leopoldina",
		"stateCode": "MG"
	},
	{
		"id": 3138500,
		"name": "Liberdade",
		"stateCode": "MG"
	},
	{
		"id": 3138609,
		"name": "Lima Duarte",
		"stateCode": "MG"
	},
	{
		"id": 3138625,
		"name": "Limeira do Oeste",
		"stateCode": "MG"
	},
	{
		"id": 3138658,
		"name": "Lontra",
		"stateCode": "MG"
	},
	{
		"id": 3138674,
		"name": "Luisburgo",
		"stateCode": "MG"
	},
	{
		"id": 3138682,
		"name": "Luislândia",
		"stateCode": "MG"
	},
	{
		"id": 3138708,
		"name": "Luminárias",
		"stateCode": "MG"
	},
	{
		"id": 3138807,
		"name": "Luz",
		"stateCode": "MG"
	},
	{
		"id": 3138906,
		"name": "Machacalis",
		"stateCode": "MG"
	},
	{
		"id": 3139003,
		"name": "Machado",
		"stateCode": "MG"
	},
	{
		"id": 3139102,
		"name": "Madre de Deus de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3139201,
		"name": "Malacacheta",
		"stateCode": "MG"
	},
	{
		"id": 3139250,
		"name": "Mamonas",
		"stateCode": "MG"
	},
	{
		"id": 3139300,
		"name": "Manga",
		"stateCode": "MG"
	},
	{
		"id": 3139409,
		"name": "Manhuaçu",
		"stateCode": "MG"
	},
	{
		"id": 3139508,
		"name": "Manhumirim",
		"stateCode": "MG"
	},
	{
		"id": 3139607,
		"name": "Mantena",
		"stateCode": "MG"
	},
	{
		"id": 3139805,
		"name": "Mar de Espanha",
		"stateCode": "MG"
	},
	{
		"id": 3139706,
		"name": "Maravilhas",
		"stateCode": "MG"
	},
	{
		"id": 3139904,
		"name": "Maria da Fé",
		"stateCode": "MG"
	},
	{
		"id": 3140001,
		"name": "Mariana",
		"stateCode": "MG"
	},
	{
		"id": 3140100,
		"name": "Marilac",
		"stateCode": "MG"
	},
	{
		"id": 3140159,
		"name": "Mário Campos",
		"stateCode": "MG"
	},
	{
		"id": 3140209,
		"name": "Maripá de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3140308,
		"name": "Marliéria",
		"stateCode": "MG"
	},
	{
		"id": 3140407,
		"name": "Marmelópolis",
		"stateCode": "MG"
	},
	{
		"id": 3140506,
		"name": "Martinho Campos",
		"stateCode": "MG"
	},
	{
		"id": 3140530,
		"name": "Martins Soares",
		"stateCode": "MG"
	},
	{
		"id": 3140555,
		"name": "Mata Verde",
		"stateCode": "MG"
	},
	{
		"id": 3140605,
		"name": "Materlândia",
		"stateCode": "MG"
	},
	{
		"id": 3140704,
		"name": "Mateus Leme",
		"stateCode": "MG"
	},
	{
		"id": 3171501,
		"name": "Mathias Lobato",
		"stateCode": "MG"
	},
	{
		"id": 3140803,
		"name": "Matias Barbosa",
		"stateCode": "MG"
	},
	{
		"id": 3140852,
		"name": "Matias Cardoso",
		"stateCode": "MG"
	},
	{
		"id": 3140902,
		"name": "Matipó",
		"stateCode": "MG"
	},
	{
		"id": 3141009,
		"name": "Mato Verde",
		"stateCode": "MG"
	},
	{
		"id": 3141108,
		"name": "Matozinhos",
		"stateCode": "MG"
	},
	{
		"id": 3141207,
		"name": "Matutina",
		"stateCode": "MG"
	},
	{
		"id": 3141306,
		"name": "Medeiros",
		"stateCode": "MG"
	},
	{
		"id": 3141405,
		"name": "Medina",
		"stateCode": "MG"
	},
	{
		"id": 3141504,
		"name": "Mendes Pimentel",
		"stateCode": "MG"
	},
	{
		"id": 3141603,
		"name": "Mercês",
		"stateCode": "MG"
	},
	{
		"id": 3141702,
		"name": "Mesquita",
		"stateCode": "MG"
	},
	{
		"id": 3141801,
		"name": "Minas Novas",
		"stateCode": "MG"
	},
	{
		"id": 3141900,
		"name": "Minduri",
		"stateCode": "MG"
	},
	{
		"id": 3142007,
		"name": "Mirabela",
		"stateCode": "MG"
	},
	{
		"id": 3142106,
		"name": "Miradouro",
		"stateCode": "MG"
	},
	{
		"id": 3142205,
		"name": "Miraí",
		"stateCode": "MG"
	},
	{
		"id": 3142254,
		"name": "Miravânia",
		"stateCode": "MG"
	},
	{
		"id": 3142304,
		"name": "Moeda",
		"stateCode": "MG"
	},
	{
		"id": 3142403,
		"name": "Moema",
		"stateCode": "MG"
	},
	{
		"id": 3142502,
		"name": "Monjolos",
		"stateCode": "MG"
	},
	{
		"id": 3142601,
		"name": "Monsenhor Paulo",
		"stateCode": "MG"
	},
	{
		"id": 3142700,
		"name": "Montalvânia",
		"stateCode": "MG"
	},
	{
		"id": 3142809,
		"name": "Monte Alegre de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3142908,
		"name": "Monte Azul",
		"stateCode": "MG"
	},
	{
		"id": 3143005,
		"name": "Monte Belo",
		"stateCode": "MG"
	},
	{
		"id": 3143104,
		"name": "Monte Carmelo",
		"stateCode": "MG"
	},
	{
		"id": 3143153,
		"name": "Monte Formoso",
		"stateCode": "MG"
	},
	{
		"id": 3143203,
		"name": "Monte Santo de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3143401,
		"name": "Monte Sião",
		"stateCode": "MG"
	},
	{
		"id": 3143302,
		"name": "Montes Claros",
		"stateCode": "MG"
	},
	{
		"id": 3143450,
		"name": "Montezuma",
		"stateCode": "MG"
	},
	{
		"id": 3143500,
		"name": "Morada Nova de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3143609,
		"name": "Morro da Garça",
		"stateCode": "MG"
	},
	{
		"id": 3143708,
		"name": "Morro do Pilar",
		"stateCode": "MG"
	},
	{
		"id": 3143807,
		"name": "Munhoz",
		"stateCode": "MG"
	},
	{
		"id": 3143906,
		"name": "Muriaé",
		"stateCode": "MG"
	},
	{
		"id": 3144003,
		"name": "Mutum",
		"stateCode": "MG"
	},
	{
		"id": 3144102,
		"name": "Muzambinho",
		"stateCode": "MG"
	},
	{
		"id": 3144201,
		"name": "Nacip Raydan",
		"stateCode": "MG"
	},
	{
		"id": 3144300,
		"name": "Nanuque",
		"stateCode": "MG"
	},
	{
		"id": 3144359,
		"name": "Naque",
		"stateCode": "MG"
	},
	{
		"id": 3144375,
		"name": "Natalândia",
		"stateCode": "MG"
	},
	{
		"id": 3144409,
		"name": "Natércia",
		"stateCode": "MG"
	},
	{
		"id": 3144508,
		"name": "Nazareno",
		"stateCode": "MG"
	},
	{
		"id": 3144607,
		"name": "Nepomuceno",
		"stateCode": "MG"
	},
	{
		"id": 3144656,
		"name": "Ninheira",
		"stateCode": "MG"
	},
	{
		"id": 3144672,
		"name": "Nova Belém",
		"stateCode": "MG"
	},
	{
		"id": 3144706,
		"name": "Nova Era",
		"stateCode": "MG"
	},
	{
		"id": 3144805,
		"name": "Nova Lima",
		"stateCode": "MG"
	},
	{
		"id": 3144904,
		"name": "Nova Módica",
		"stateCode": "MG"
	},
	{
		"id": 3145000,
		"name": "Nova Ponte",
		"stateCode": "MG"
	},
	{
		"id": 3145059,
		"name": "Nova Porteirinha",
		"stateCode": "MG"
	},
	{
		"id": 3145109,
		"name": "Nova Resende",
		"stateCode": "MG"
	},
	{
		"id": 3145208,
		"name": "Nova Serrana",
		"stateCode": "MG"
	},
	{
		"id": 3136603,
		"name": "Nova União",
		"stateCode": "MG"
	},
	{
		"id": 3145307,
		"name": "Novo Cruzeiro",
		"stateCode": "MG"
	},
	{
		"id": 3145356,
		"name": "Novo Oriente de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3145372,
		"name": "Novorizonte",
		"stateCode": "MG"
	},
	{
		"id": 3145406,
		"name": "Olaria",
		"stateCode": "MG"
	},
	{
		"id": 3145455,
		"name": "Olhos-d'Água",
		"stateCode": "MG"
	},
	{
		"id": 3145505,
		"name": "Olímpio Noronha",
		"stateCode": "MG"
	},
	{
		"id": 3145604,
		"name": "Oliveira",
		"stateCode": "MG"
	},
	{
		"id": 3145703,
		"name": "Oliveira Fortes",
		"stateCode": "MG"
	},
	{
		"id": 3145802,
		"name": "Onça de Pitangui",
		"stateCode": "MG"
	},
	{
		"id": 3145851,
		"name": "Oratórios",
		"stateCode": "MG"
	},
	{
		"id": 3145877,
		"name": "Orizânia",
		"stateCode": "MG"
	},
	{
		"id": 3145901,
		"name": "Ouro Branco",
		"stateCode": "MG"
	},
	{
		"id": 3146008,
		"name": "Ouro Fino",
		"stateCode": "MG"
	},
	{
		"id": 3146107,
		"name": "Ouro Preto",
		"stateCode": "MG"
	},
	{
		"id": 3146206,
		"name": "Ouro Verde de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3146255,
		"name": "Padre Carvalho",
		"stateCode": "MG"
	},
	{
		"id": 3146305,
		"name": "Padre Paraíso",
		"stateCode": "MG"
	},
	{
		"id": 3146552,
		"name": "Pai Pedro",
		"stateCode": "MG"
	},
	{
		"id": 3146404,
		"name": "Paineiras",
		"stateCode": "MG"
	},
	{
		"id": 3146503,
		"name": "Pains",
		"stateCode": "MG"
	},
	{
		"id": 3146602,
		"name": "Paiva",
		"stateCode": "MG"
	},
	{
		"id": 3146701,
		"name": "Palma",
		"stateCode": "MG"
	},
	{
		"id": 3146750,
		"name": "Palmópolis",
		"stateCode": "MG"
	},
	{
		"id": 3146909,
		"name": "Papagaios",
		"stateCode": "MG"
	},
	{
		"id": 3147105,
		"name": "Pará de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3147006,
		"name": "Paracatu",
		"stateCode": "MG"
	},
	{
		"id": 3147204,
		"name": "Paraguaçu",
		"stateCode": "MG"
	},
	{
		"id": 3147303,
		"name": "Paraisópolis",
		"stateCode": "MG"
	},
	{
		"id": 3147402,
		"name": "Paraopeba",
		"stateCode": "MG"
	},
	{
		"id": 3147600,
		"name": "Passa Quatro",
		"stateCode": "MG"
	},
	{
		"id": 3147709,
		"name": "Passa Tempo",
		"stateCode": "MG"
	},
	{
		"id": 3147808,
		"name": "Passa Vinte",
		"stateCode": "MG"
	},
	{
		"id": 3147501,
		"name": "Passabém",
		"stateCode": "MG"
	},
	{
		"id": 3147907,
		"name": "Passos",
		"stateCode": "MG"
	},
	{
		"id": 3147956,
		"name": "Patis",
		"stateCode": "MG"
	},
	{
		"id": 3148004,
		"name": "Patos de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3148103,
		"name": "Patrocínio",
		"stateCode": "MG"
	},
	{
		"id": 3148202,
		"name": "Patrocínio do Muriaé",
		"stateCode": "MG"
	},
	{
		"id": 3148301,
		"name": "Paula Cândido",
		"stateCode": "MG"
	},
	{
		"id": 3148400,
		"name": "Paulistas",
		"stateCode": "MG"
	},
	{
		"id": 3148509,
		"name": "Pavão",
		"stateCode": "MG"
	},
	{
		"id": 3148608,
		"name": "Peçanha",
		"stateCode": "MG"
	},
	{
		"id": 3148707,
		"name": "Pedra Azul",
		"stateCode": "MG"
	},
	{
		"id": 3148756,
		"name": "Pedra Bonita",
		"stateCode": "MG"
	},
	{
		"id": 3148806,
		"name": "Pedra do Anta",
		"stateCode": "MG"
	},
	{
		"id": 3148905,
		"name": "Pedra do Indaiá",
		"stateCode": "MG"
	},
	{
		"id": 3149002,
		"name": "Pedra Dourada",
		"stateCode": "MG"
	},
	{
		"id": 3149101,
		"name": "Pedralva",
		"stateCode": "MG"
	},
	{
		"id": 3149150,
		"name": "Pedras de Maria da Cruz",
		"stateCode": "MG"
	},
	{
		"id": 3149200,
		"name": "Pedrinópolis",
		"stateCode": "MG"
	},
	{
		"id": 3149309,
		"name": "Pedro Leopoldo",
		"stateCode": "MG"
	},
	{
		"id": 3149408,
		"name": "Pedro Teixeira",
		"stateCode": "MG"
	},
	{
		"id": 3149507,
		"name": "Pequeri",
		"stateCode": "MG"
	},
	{
		"id": 3149606,
		"name": "Pequi",
		"stateCode": "MG"
	},
	{
		"id": 3149705,
		"name": "Perdigão",
		"stateCode": "MG"
	},
	{
		"id": 3149804,
		"name": "Perdizes",
		"stateCode": "MG"
	},
	{
		"id": 3149903,
		"name": "Perdões",
		"stateCode": "MG"
	},
	{
		"id": 3149952,
		"name": "Periquito",
		"stateCode": "MG"
	},
	{
		"id": 3150000,
		"name": "Pescador",
		"stateCode": "MG"
	},
	{
		"id": 3150109,
		"name": "Piau",
		"stateCode": "MG"
	},
	{
		"id": 3150158,
		"name": "Piedade de Caratinga",
		"stateCode": "MG"
	},
	{
		"id": 3150208,
		"name": "Piedade de Ponte Nova",
		"stateCode": "MG"
	},
	{
		"id": 3150307,
		"name": "Piedade do Rio Grande",
		"stateCode": "MG"
	},
	{
		"id": 3150406,
		"name": "Piedade dos Gerais",
		"stateCode": "MG"
	},
	{
		"id": 3150505,
		"name": "Pimenta",
		"stateCode": "MG"
	},
	{
		"id": 3150539,
		"name": "Pingo-d'Água",
		"stateCode": "MG"
	},
	{
		"id": 3150570,
		"name": "Pintópolis",
		"stateCode": "MG"
	},
	{
		"id": 3150604,
		"name": "Piracema",
		"stateCode": "MG"
	},
	{
		"id": 3150703,
		"name": "Pirajuba",
		"stateCode": "MG"
	},
	{
		"id": 3150802,
		"name": "Piranga",
		"stateCode": "MG"
	},
	{
		"id": 3150901,
		"name": "Piranguçu",
		"stateCode": "MG"
	},
	{
		"id": 3151008,
		"name": "Piranguinho",
		"stateCode": "MG"
	},
	{
		"id": 3151107,
		"name": "Pirapetinga",
		"stateCode": "MG"
	},
	{
		"id": 3151206,
		"name": "Pirapora",
		"stateCode": "MG"
	},
	{
		"id": 3151305,
		"name": "Piraúba",
		"stateCode": "MG"
	},
	{
		"id": 3151404,
		"name": "Pitangui",
		"stateCode": "MG"
	},
	{
		"id": 3151503,
		"name": "Piumhi",
		"stateCode": "MG"
	},
	{
		"id": 3151602,
		"name": "Planura",
		"stateCode": "MG"
	},
	{
		"id": 3151701,
		"name": "Poço Fundo",
		"stateCode": "MG"
	},
	{
		"id": 3151800,
		"name": "Poços de Caldas",
		"stateCode": "MG"
	},
	{
		"id": 3151909,
		"name": "Pocrane",
		"stateCode": "MG"
	},
	{
		"id": 3152006,
		"name": "Pompéu",
		"stateCode": "MG"
	},
	{
		"id": 3152105,
		"name": "Ponte Nova",
		"stateCode": "MG"
	},
	{
		"id": 3152131,
		"name": "Ponto Chique",
		"stateCode": "MG"
	},
	{
		"id": 3152170,
		"name": "Ponto dos Volantes",
		"stateCode": "MG"
	},
	{
		"id": 3152204,
		"name": "Porteirinha",
		"stateCode": "MG"
	},
	{
		"id": 3152303,
		"name": "Porto Firme",
		"stateCode": "MG"
	},
	{
		"id": 3152402,
		"name": "Poté",
		"stateCode": "MG"
	},
	{
		"id": 3152501,
		"name": "Pouso Alegre",
		"stateCode": "MG"
	},
	{
		"id": 3152600,
		"name": "Pouso Alto",
		"stateCode": "MG"
	},
	{
		"id": 3152709,
		"name": "Prados",
		"stateCode": "MG"
	},
	{
		"id": 3152808,
		"name": "Prata",
		"stateCode": "MG"
	},
	{
		"id": 3152907,
		"name": "Pratápolis",
		"stateCode": "MG"
	},
	{
		"id": 3153004,
		"name": "Pratinha",
		"stateCode": "MG"
	},
	{
		"id": 3153103,
		"name": "Presidente Bernardes",
		"stateCode": "MG"
	},
	{
		"id": 3153202,
		"name": "Presidente Juscelino",
		"stateCode": "MG"
	},
	{
		"id": 3153301,
		"name": "Presidente Kubitschek",
		"stateCode": "MG"
	},
	{
		"id": 3153400,
		"name": "Presidente Olegário",
		"stateCode": "MG"
	},
	{
		"id": 3153608,
		"name": "Prudente de Morais",
		"stateCode": "MG"
	},
	{
		"id": 3153707,
		"name": "Quartel Geral",
		"stateCode": "MG"
	},
	{
		"id": 3153806,
		"name": "Queluzito",
		"stateCode": "MG"
	},
	{
		"id": 3153905,
		"name": "Raposos",
		"stateCode": "MG"
	},
	{
		"id": 3154002,
		"name": "Raul Soares",
		"stateCode": "MG"
	},
	{
		"id": 3154101,
		"name": "Recreio",
		"stateCode": "MG"
	},
	{
		"id": 3154150,
		"name": "Reduto",
		"stateCode": "MG"
	},
	{
		"id": 3154200,
		"name": "Resende Costa",
		"stateCode": "MG"
	},
	{
		"id": 3154309,
		"name": "Resplendor",
		"stateCode": "MG"
	},
	{
		"id": 3154408,
		"name": "Ressaquinha",
		"stateCode": "MG"
	},
	{
		"id": 3154457,
		"name": "Riachinho",
		"stateCode": "MG"
	},
	{
		"id": 3154507,
		"name": "Riacho dos Machados",
		"stateCode": "MG"
	},
	{
		"id": 3154606,
		"name": "Ribeirão das Neves",
		"stateCode": "MG"
	},
	{
		"id": 3154705,
		"name": "Ribeirão Vermelho",
		"stateCode": "MG"
	},
	{
		"id": 3154804,
		"name": "Rio Acima",
		"stateCode": "MG"
	},
	{
		"id": 3154903,
		"name": "Rio Casca",
		"stateCode": "MG"
	},
	{
		"id": 3155108,
		"name": "Rio do Prado",
		"stateCode": "MG"
	},
	{
		"id": 3155009,
		"name": "Rio Doce",
		"stateCode": "MG"
	},
	{
		"id": 3155207,
		"name": "Rio Espera",
		"stateCode": "MG"
	},
	{
		"id": 3155306,
		"name": "Rio Manso",
		"stateCode": "MG"
	},
	{
		"id": 3155405,
		"name": "Rio Novo",
		"stateCode": "MG"
	},
	{
		"id": 3155504,
		"name": "Rio Paranaíba",
		"stateCode": "MG"
	},
	{
		"id": 3155603,
		"name": "Rio Pardo de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3155702,
		"name": "Rio Piracicaba",
		"stateCode": "MG"
	},
	{
		"id": 3155801,
		"name": "Rio Pomba",
		"stateCode": "MG"
	},
	{
		"id": 3155900,
		"name": "Rio Preto",
		"stateCode": "MG"
	},
	{
		"id": 3156007,
		"name": "Rio Vermelho",
		"stateCode": "MG"
	},
	{
		"id": 3156106,
		"name": "Ritápolis",
		"stateCode": "MG"
	},
	{
		"id": 3156205,
		"name": "Rochedo de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3156304,
		"name": "Rodeiro",
		"stateCode": "MG"
	},
	{
		"id": 3156403,
		"name": "Romaria",
		"stateCode": "MG"
	},
	{
		"id": 3156452,
		"name": "Rosário da Limeira",
		"stateCode": "MG"
	},
	{
		"id": 3156502,
		"name": "Rubelita",
		"stateCode": "MG"
	},
	{
		"id": 3156601,
		"name": "Rubim",
		"stateCode": "MG"
	},
	{
		"id": 3156700,
		"name": "Sabará",
		"stateCode": "MG"
	},
	{
		"id": 3156809,
		"name": "Sabinópolis",
		"stateCode": "MG"
	},
	{
		"id": 3156908,
		"name": "Sacramento",
		"stateCode": "MG"
	},
	{
		"id": 3157005,
		"name": "Salinas",
		"stateCode": "MG"
	},
	{
		"id": 3157104,
		"name": "Salto da Divisa",
		"stateCode": "MG"
	},
	{
		"id": 3157203,
		"name": "Santa Bárbara",
		"stateCode": "MG"
	},
	{
		"id": 3157252,
		"name": "Santa Bárbara do Leste",
		"stateCode": "MG"
	},
	{
		"id": 3157278,
		"name": "Santa Bárbara do Monte Verde",
		"stateCode": "MG"
	},
	{
		"id": 3157302,
		"name": "Santa Bárbara do Tugúrio",
		"stateCode": "MG"
	},
	{
		"id": 3157336,
		"name": "Santa Cruz de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3157377,
		"name": "Santa Cruz de Salinas",
		"stateCode": "MG"
	},
	{
		"id": 3157401,
		"name": "Santa Cruz do Escalvado",
		"stateCode": "MG"
	},
	{
		"id": 3157500,
		"name": "Santa Efigênia de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3157609,
		"name": "Santa Fé de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3157658,
		"name": "Santa Helena de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3157708,
		"name": "Santa Juliana",
		"stateCode": "MG"
	},
	{
		"id": 3157807,
		"name": "Santa Luzia",
		"stateCode": "MG"
	},
	{
		"id": 3157906,
		"name": "Santa Margarida",
		"stateCode": "MG"
	},
	{
		"id": 3158003,
		"name": "Santa Maria de Itabira",
		"stateCode": "MG"
	},
	{
		"id": 3158102,
		"name": "Santa Maria do Salto",
		"stateCode": "MG"
	},
	{
		"id": 3158201,
		"name": "Santa Maria do Suaçuí",
		"stateCode": "MG"
	},
	{
		"id": 3159209,
		"name": "Santa Rita de Caldas",
		"stateCode": "MG"
	},
	{
		"id": 3159407,
		"name": "Santa Rita de Ibitipoca",
		"stateCode": "MG"
	},
	{
		"id": 3159308,
		"name": "Santa Rita de Jacutinga",
		"stateCode": "MG"
	},
	{
		"id": 3159357,
		"name": "Santa Rita de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3159506,
		"name": "Santa Rita do Itueto",
		"stateCode": "MG"
	},
	{
		"id": 3159605,
		"name": "Santa Rita do Sapucaí",
		"stateCode": "MG"
	},
	{
		"id": 3159704,
		"name": "Santa Rosa da Serra",
		"stateCode": "MG"
	},
	{
		"id": 3159803,
		"name": "Santa Vitória",
		"stateCode": "MG"
	},
	{
		"id": 3158300,
		"name": "Santana da Vargem",
		"stateCode": "MG"
	},
	{
		"id": 3158409,
		"name": "Santana de Cataguases",
		"stateCode": "MG"
	},
	{
		"id": 3158508,
		"name": "Santana de Pirapama",
		"stateCode": "MG"
	},
	{
		"id": 3158607,
		"name": "Santana do Deserto",
		"stateCode": "MG"
	},
	{
		"id": 3158706,
		"name": "Santana do Garambéu",
		"stateCode": "MG"
	},
	{
		"id": 3158805,
		"name": "Santana do Jacaré",
		"stateCode": "MG"
	},
	{
		"id": 3158904,
		"name": "Santana do Manhuaçu",
		"stateCode": "MG"
	},
	{
		"id": 3158953,
		"name": "Santana do Paraíso",
		"stateCode": "MG"
	},
	{
		"id": 3159001,
		"name": "Santana do Riacho",
		"stateCode": "MG"
	},
	{
		"id": 3159100,
		"name": "Santana dos Montes",
		"stateCode": "MG"
	},
	{
		"id": 3159902,
		"name": "Santo Antônio do Amparo",
		"stateCode": "MG"
	},
	{
		"id": 3160009,
		"name": "Santo Antônio do Aventureiro",
		"stateCode": "MG"
	},
	{
		"id": 3160108,
		"name": "Santo Antônio do Grama",
		"stateCode": "MG"
	},
	{
		"id": 3160207,
		"name": "Santo Antônio do Itambé",
		"stateCode": "MG"
	},
	{
		"id": 3160306,
		"name": "Santo Antônio do Jacinto",
		"stateCode": "MG"
	},
	{
		"id": 3160405,
		"name": "Santo Antônio do Monte",
		"stateCode": "MG"
	},
	{
		"id": 3160454,
		"name": "Santo Antônio do Retiro",
		"stateCode": "MG"
	},
	{
		"id": 3160504,
		"name": "Santo Antônio do Rio Abaixo",
		"stateCode": "MG"
	},
	{
		"id": 3160603,
		"name": "Santo Hipólito",
		"stateCode": "MG"
	},
	{
		"id": 3160702,
		"name": "Santos Dumont",
		"stateCode": "MG"
	},
	{
		"id": 3160801,
		"name": "São Bento Abade",
		"stateCode": "MG"
	},
	{
		"id": 3160900,
		"name": "São Brás do Suaçuí",
		"stateCode": "MG"
	},
	{
		"id": 3160959,
		"name": "São Domingos das Dores",
		"stateCode": "MG"
	},
	{
		"id": 3161007,
		"name": "São Domingos do Prata",
		"stateCode": "MG"
	},
	{
		"id": 3161056,
		"name": "São Félix de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3161106,
		"name": "São Francisco",
		"stateCode": "MG"
	},
	{
		"id": 3161205,
		"name": "São Francisco de Paula",
		"stateCode": "MG"
	},
	{
		"id": 3161304,
		"name": "São Francisco de Sales",
		"stateCode": "MG"
	},
	{
		"id": 3161403,
		"name": "São Francisco do Glória",
		"stateCode": "MG"
	},
	{
		"id": 3161502,
		"name": "São Geraldo",
		"stateCode": "MG"
	},
	{
		"id": 3161601,
		"name": "São Geraldo da Piedade",
		"stateCode": "MG"
	},
	{
		"id": 3161650,
		"name": "São Geraldo do Baixio",
		"stateCode": "MG"
	},
	{
		"id": 3161700,
		"name": "São Gonçalo do Abaeté",
		"stateCode": "MG"
	},
	{
		"id": 3161809,
		"name": "São Gonçalo do Pará",
		"stateCode": "MG"
	},
	{
		"id": 3161908,
		"name": "São Gonçalo do Rio Abaixo",
		"stateCode": "MG"
	},
	{
		"id": 3125507,
		"name": "São Gonçalo do Rio Preto",
		"stateCode": "MG"
	},
	{
		"id": 3162005,
		"name": "São Gonçalo do Sapucaí",
		"stateCode": "MG"
	},
	{
		"id": 3162104,
		"name": "São Gotardo",
		"stateCode": "MG"
	},
	{
		"id": 3162203,
		"name": "São João Batista do Glória",
		"stateCode": "MG"
	},
	{
		"id": 3162252,
		"name": "São João da Lagoa",
		"stateCode": "MG"
	},
	{
		"id": 3162302,
		"name": "São João da Mata",
		"stateCode": "MG"
	},
	{
		"id": 3162401,
		"name": "São João da Ponte",
		"stateCode": "MG"
	},
	{
		"id": 3162450,
		"name": "São João das Missões",
		"stateCode": "MG"
	},
	{
		"id": 3162500,
		"name": "São João del Rei",
		"stateCode": "MG"
	},
	{
		"id": 3162559,
		"name": "São João do Manhuaçu",
		"stateCode": "MG"
	},
	{
		"id": 3162575,
		"name": "São João do Manteninha",
		"stateCode": "MG"
	},
	{
		"id": 3162609,
		"name": "São João do Oriente",
		"stateCode": "MG"
	},
	{
		"id": 3162658,
		"name": "São João do Pacuí",
		"stateCode": "MG"
	},
	{
		"id": 3162708,
		"name": "São João do Paraíso",
		"stateCode": "MG"
	},
	{
		"id": 3162807,
		"name": "São João Evangelista",
		"stateCode": "MG"
	},
	{
		"id": 3162906,
		"name": "São João Nepomuceno",
		"stateCode": "MG"
	},
	{
		"id": 3162922,
		"name": "São Joaquim de Bicas",
		"stateCode": "MG"
	},
	{
		"id": 3162948,
		"name": "São José da Barra",
		"stateCode": "MG"
	},
	{
		"id": 3162955,
		"name": "São José da Lapa",
		"stateCode": "MG"
	},
	{
		"id": 3163003,
		"name": "São José da Safira",
		"stateCode": "MG"
	},
	{
		"id": 3163102,
		"name": "São José da Varginha",
		"stateCode": "MG"
	},
	{
		"id": 3163201,
		"name": "São José do Alegre",
		"stateCode": "MG"
	},
	{
		"id": 3163300,
		"name": "São José do Divino",
		"stateCode": "MG"
	},
	{
		"id": 3163409,
		"name": "São José do Goiabal",
		"stateCode": "MG"
	},
	{
		"id": 3163508,
		"name": "São José do Jacuri",
		"stateCode": "MG"
	},
	{
		"id": 3163607,
		"name": "São José do Mantimento",
		"stateCode": "MG"
	},
	{
		"id": 3163706,
		"name": "São Lourenço",
		"stateCode": "MG"
	},
	{
		"id": 3163805,
		"name": "São Miguel do Anta",
		"stateCode": "MG"
	},
	{
		"id": 3163904,
		"name": "São Pedro da União",
		"stateCode": "MG"
	},
	{
		"id": 3164100,
		"name": "São Pedro do Suaçuí",
		"stateCode": "MG"
	},
	{
		"id": 3164001,
		"name": "São Pedro dos Ferros",
		"stateCode": "MG"
	},
	{
		"id": 3164209,
		"name": "São Romão",
		"stateCode": "MG"
	},
	{
		"id": 3164308,
		"name": "São Roque de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3164407,
		"name": "São Sebastião da Bela Vista",
		"stateCode": "MG"
	},
	{
		"id": 3164431,
		"name": "São Sebastião da Vargem Alegre",
		"stateCode": "MG"
	},
	{
		"id": 3164472,
		"name": "São Sebastião do Anta",
		"stateCode": "MG"
	},
	{
		"id": 3164506,
		"name": "São Sebastião do Maranhão",
		"stateCode": "MG"
	},
	{
		"id": 3164605,
		"name": "São Sebastião do Oeste",
		"stateCode": "MG"
	},
	{
		"id": 3164704,
		"name": "São Sebastião do Paraíso",
		"stateCode": "MG"
	},
	{
		"id": 3164803,
		"name": "São Sebastião do Rio Preto",
		"stateCode": "MG"
	},
	{
		"id": 3164902,
		"name": "São Sebastião do Rio Verde",
		"stateCode": "MG"
	},
	{
		"id": 3165008,
		"name": "São Tiago",
		"stateCode": "MG"
	},
	{
		"id": 3165107,
		"name": "São Tomás de Aquino",
		"stateCode": "MG"
	},
	{
		"id": 3165206,
		"name": "São Tomé das Letras",
		"stateCode": "MG"
	},
	{
		"id": 3165305,
		"name": "São Vicente de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3165404,
		"name": "Sapucaí-Mirim",
		"stateCode": "MG"
	},
	{
		"id": 3165503,
		"name": "Sardoá",
		"stateCode": "MG"
	},
	{
		"id": 3165537,
		"name": "Sarzedo",
		"stateCode": "MG"
	},
	{
		"id": 3165560,
		"name": "Sem-Peixe",
		"stateCode": "MG"
	},
	{
		"id": 3165578,
		"name": "Senador Amaral",
		"stateCode": "MG"
	},
	{
		"id": 3165602,
		"name": "Senador Cortes",
		"stateCode": "MG"
	},
	{
		"id": 3165701,
		"name": "Senador Firmino",
		"stateCode": "MG"
	},
	{
		"id": 3165800,
		"name": "Senador José Bento",
		"stateCode": "MG"
	},
	{
		"id": 3165909,
		"name": "Senador Modestino Gonçalves",
		"stateCode": "MG"
	},
	{
		"id": 3166006,
		"name": "Senhora de Oliveira",
		"stateCode": "MG"
	},
	{
		"id": 3166105,
		"name": "Senhora do Porto",
		"stateCode": "MG"
	},
	{
		"id": 3166204,
		"name": "Senhora dos Remédios",
		"stateCode": "MG"
	},
	{
		"id": 3166303,
		"name": "Sericita",
		"stateCode": "MG"
	},
	{
		"id": 3166402,
		"name": "Seritinga",
		"stateCode": "MG"
	},
	{
		"id": 3166501,
		"name": "Serra Azul de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3166600,
		"name": "Serra da Saudade",
		"stateCode": "MG"
	},
	{
		"id": 3166808,
		"name": "Serra do Salitre",
		"stateCode": "MG"
	},
	{
		"id": 3166709,
		"name": "Serra dos Aimorés",
		"stateCode": "MG"
	},
	{
		"id": 3166907,
		"name": "Serrania",
		"stateCode": "MG"
	},
	{
		"id": 3166956,
		"name": "Serranópolis de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3167004,
		"name": "Serranos",
		"stateCode": "MG"
	},
	{
		"id": 3167103,
		"name": "Serro",
		"stateCode": "MG"
	},
	{
		"id": 3167202,
		"name": "Sete Lagoas",
		"stateCode": "MG"
	},
	{
		"id": 3165552,
		"name": "Setubinha",
		"stateCode": "MG"
	},
	{
		"id": 3167301,
		"name": "Silveirânia",
		"stateCode": "MG"
	},
	{
		"id": 3167400,
		"name": "Silvianópolis",
		"stateCode": "MG"
	},
	{
		"id": 3167509,
		"name": "Simão Pereira",
		"stateCode": "MG"
	},
	{
		"id": 3167608,
		"name": "Simonésia",
		"stateCode": "MG"
	},
	{
		"id": 3167707,
		"name": "Sobrália",
		"stateCode": "MG"
	},
	{
		"id": 3167806,
		"name": "Soledade de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3167905,
		"name": "Tabuleiro",
		"stateCode": "MG"
	},
	{
		"id": 3168002,
		"name": "Taiobeiras",
		"stateCode": "MG"
	},
	{
		"id": 3168051,
		"name": "Taparuba",
		"stateCode": "MG"
	},
	{
		"id": 3168101,
		"name": "Tapira",
		"stateCode": "MG"
	},
	{
		"id": 3168200,
		"name": "Tapiraí",
		"stateCode": "MG"
	},
	{
		"id": 3168309,
		"name": "Taquaraçu de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3168408,
		"name": "Tarumirim",
		"stateCode": "MG"
	},
	{
		"id": 3168507,
		"name": "Teixeiras",
		"stateCode": "MG"
	},
	{
		"id": 3168606,
		"name": "Teófilo Otoni",
		"stateCode": "MG"
	},
	{
		"id": 3168705,
		"name": "Timóteo",
		"stateCode": "MG"
	},
	{
		"id": 3168804,
		"name": "Tiradentes",
		"stateCode": "MG"
	},
	{
		"id": 3168903,
		"name": "Tiros",
		"stateCode": "MG"
	},
	{
		"id": 3169000,
		"name": "Tocantins",
		"stateCode": "MG"
	},
	{
		"id": 3169059,
		"name": "Tocos do Moji",
		"stateCode": "MG"
	},
	{
		"id": 3169109,
		"name": "Toledo",
		"stateCode": "MG"
	},
	{
		"id": 3169208,
		"name": "Tombos",
		"stateCode": "MG"
	},
	{
		"id": 3169307,
		"name": "Três Corações",
		"stateCode": "MG"
	},
	{
		"id": 3169356,
		"name": "Três Marias",
		"stateCode": "MG"
	},
	{
		"id": 3169406,
		"name": "Três Pontas",
		"stateCode": "MG"
	},
	{
		"id": 3169505,
		"name": "Tumiritinga",
		"stateCode": "MG"
	},
	{
		"id": 3169604,
		"name": "Tupaciguara",
		"stateCode": "MG"
	},
	{
		"id": 3169703,
		"name": "Turmalina",
		"stateCode": "MG"
	},
	{
		"id": 3169802,
		"name": "Turvolândia",
		"stateCode": "MG"
	},
	{
		"id": 3169901,
		"name": "Ubá",
		"stateCode": "MG"
	},
	{
		"id": 3170008,
		"name": "Ubaí",
		"stateCode": "MG"
	},
	{
		"id": 3170057,
		"name": "Ubaporanga",
		"stateCode": "MG"
	},
	{
		"id": 3170107,
		"name": "Uberaba",
		"stateCode": "MG"
	},
	{
		"id": 3170206,
		"name": "Uberlândia",
		"stateCode": "MG"
	},
	{
		"id": 3170305,
		"name": "Umburatiba",
		"stateCode": "MG"
	},
	{
		"id": 3170404,
		"name": "Unaí",
		"stateCode": "MG"
	},
	{
		"id": 3170438,
		"name": "União de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3170479,
		"name": "Uruana de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3170503,
		"name": "Urucânia",
		"stateCode": "MG"
	},
	{
		"id": 3170529,
		"name": "Urucuia",
		"stateCode": "MG"
	},
	{
		"id": 3170578,
		"name": "Vargem Alegre",
		"stateCode": "MG"
	},
	{
		"id": 3170602,
		"name": "Vargem Bonita",
		"stateCode": "MG"
	},
	{
		"id": 3170651,
		"name": "Vargem Grande do Rio Pardo",
		"stateCode": "MG"
	},
	{
		"id": 3170701,
		"name": "Varginha",
		"stateCode": "MG"
	},
	{
		"id": 3170750,
		"name": "Varjão de Minas",
		"stateCode": "MG"
	},
	{
		"id": 3170800,
		"name": "Várzea da Palma",
		"stateCode": "MG"
	},
	{
		"id": 3170909,
		"name": "Varzelândia",
		"stateCode": "MG"
	},
	{
		"id": 3171006,
		"name": "Vazante",
		"stateCode": "MG"
	},
	{
		"id": 3171030,
		"name": "Verdelândia",
		"stateCode": "MG"
	},
	{
		"id": 3171071,
		"name": "Veredinha",
		"stateCode": "MG"
	},
	{
		"id": 3171105,
		"name": "Veríssimo",
		"stateCode": "MG"
	},
	{
		"id": 3171154,
		"name": "Vermelho Novo",
		"stateCode": "MG"
	},
	{
		"id": 3171204,
		"name": "Vespasiano",
		"stateCode": "MG"
	},
	{
		"id": 3171303,
		"name": "Viçosa",
		"stateCode": "MG"
	},
	{
		"id": 3171402,
		"name": "Vieiras",
		"stateCode": "MG"
	},
	{
		"id": 3171600,
		"name": "Virgem da Lapa",
		"stateCode": "MG"
	},
	{
		"id": 3171709,
		"name": "Virgínia",
		"stateCode": "MG"
	},
	{
		"id": 3171808,
		"name": "Virginópolis",
		"stateCode": "MG"
	},
	{
		"id": 3171907,
		"name": "Virgolândia",
		"stateCode": "MG"
	},
	{
		"id": 3172004,
		"name": "Visconde do Rio Branco",
		"stateCode": "MG"
	},
	{
		"id": 3172103,
		"name": "Volta Grande",
		"stateCode": "MG"
	},
	{
		"id": 3172202,
		"name": "Wenceslau Braz",
		"stateCode": "MG"
	},
	{
		"id": 5000203,
		"name": "Água Clara",
		"stateCode": "MS"
	},
	{
		"id": 5000252,
		"name": "Alcinópolis",
		"stateCode": "MS"
	},
	{
		"id": 5000609,
		"name": "Amambai",
		"stateCode": "MS"
	},
	{
		"id": 5000708,
		"name": "Anastácio",
		"stateCode": "MS"
	},
	{
		"id": 5000807,
		"name": "Anaurilândia",
		"stateCode": "MS"
	},
	{
		"id": 5000856,
		"name": "Angélica",
		"stateCode": "MS"
	},
	{
		"id": 5000906,
		"name": "Antônio João",
		"stateCode": "MS"
	},
	{
		"id": 5001003,
		"name": "Aparecida do Taboado",
		"stateCode": "MS"
	},
	{
		"id": 5001102,
		"name": "Aquidauana",
		"stateCode": "MS"
	},
	{
		"id": 5001243,
		"name": "Aral Moreira",
		"stateCode": "MS"
	},
	{
		"id": 5001508,
		"name": "Bandeirantes",
		"stateCode": "MS"
	},
	{
		"id": 5001904,
		"name": "Bataguassu",
		"stateCode": "MS"
	},
	{
		"id": 5002001,
		"name": "Batayporã",
		"stateCode": "MS"
	},
	{
		"id": 5002100,
		"name": "Bela Vista",
		"stateCode": "MS"
	},
	{
		"id": 5002159,
		"name": "Bodoquena",
		"stateCode": "MS"
	},
	{
		"id": 5002209,
		"name": "Bonito",
		"stateCode": "MS"
	},
	{
		"id": 5002308,
		"name": "Brasilândia",
		"stateCode": "MS"
	},
	{
		"id": 5002407,
		"name": "Caarapó",
		"stateCode": "MS"
	},
	{
		"id": 5002605,
		"name": "Camapuã",
		"stateCode": "MS"
	},
	{
		"id": 5002704,
		"name": "Campo Grande",
		"stateCode": "MS"
	},
	{
		"id": 5002803,
		"name": "Caracol",
		"stateCode": "MS"
	},
	{
		"id": 5002902,
		"name": "Cassilândia",
		"stateCode": "MS"
	},
	{
		"id": 5002951,
		"name": "Chapadão do Sul",
		"stateCode": "MS"
	},
	{
		"id": 5003108,
		"name": "Corguinho",
		"stateCode": "MS"
	},
	{
		"id": 5003157,
		"name": "Coronel Sapucaia",
		"stateCode": "MS"
	},
	{
		"id": 5003207,
		"name": "Corumbá",
		"stateCode": "MS"
	},
	{
		"id": 5003256,
		"name": "Costa Rica",
		"stateCode": "MS"
	},
	{
		"id": 5003306,
		"name": "Coxim",
		"stateCode": "MS"
	},
	{
		"id": 5003454,
		"name": "Deodápolis",
		"stateCode": "MS"
	},
	{
		"id": 5003488,
		"name": "Dois Irmãos do Buriti",
		"stateCode": "MS"
	},
	{
		"id": 5003504,
		"name": "Douradina",
		"stateCode": "MS"
	},
	{
		"id": 5003702,
		"name": "Dourados",
		"stateCode": "MS"
	},
	{
		"id": 5003751,
		"name": "Eldorado",
		"stateCode": "MS"
	},
	{
		"id": 5003801,
		"name": "Fátima do Sul",
		"stateCode": "MS"
	},
	{
		"id": 5003900,
		"name": "Figueirão",
		"stateCode": "MS"
	},
	{
		"id": 5004007,
		"name": "Glória de Dourados",
		"stateCode": "MS"
	},
	{
		"id": 5004106,
		"name": "Guia Lopes da Laguna",
		"stateCode": "MS"
	},
	{
		"id": 5004304,
		"name": "Iguatemi",
		"stateCode": "MS"
	},
	{
		"id": 5004403,
		"name": "Inocência",
		"stateCode": "MS"
	},
	{
		"id": 5004502,
		"name": "Itaporã",
		"stateCode": "MS"
	},
	{
		"id": 5004601,
		"name": "Itaquiraí",
		"stateCode": "MS"
	},
	{
		"id": 5004700,
		"name": "Ivinhema",
		"stateCode": "MS"
	},
	{
		"id": 5004809,
		"name": "Japorã",
		"stateCode": "MS"
	},
	{
		"id": 5004908,
		"name": "Jaraguari",
		"stateCode": "MS"
	},
	{
		"id": 5005004,
		"name": "Jardim",
		"stateCode": "MS"
	},
	{
		"id": 5005103,
		"name": "Jateí",
		"stateCode": "MS"
	},
	{
		"id": 5005152,
		"name": "Juti",
		"stateCode": "MS"
	},
	{
		"id": 5005202,
		"name": "Ladário",
		"stateCode": "MS"
	},
	{
		"id": 5005251,
		"name": "Laguna Carapã",
		"stateCode": "MS"
	},
	{
		"id": 5005400,
		"name": "Maracaju",
		"stateCode": "MS"
	},
	{
		"id": 5005608,
		"name": "Miranda",
		"stateCode": "MS"
	},
	{
		"id": 5005681,
		"name": "Mundo Novo",
		"stateCode": "MS"
	},
	{
		"id": 5005707,
		"name": "Naviraí",
		"stateCode": "MS"
	},
	{
		"id": 5005806,
		"name": "Nioaque",
		"stateCode": "MS"
	},
	{
		"id": 5006002,
		"name": "Nova Alvorada do Sul",
		"stateCode": "MS"
	},
	{
		"id": 5006200,
		"name": "Nova Andradina",
		"stateCode": "MS"
	},
	{
		"id": 5006259,
		"name": "Novo Horizonte do Sul",
		"stateCode": "MS"
	},
	{
		"id": 5006275,
		"name": "Paraíso das Águas",
		"stateCode": "MS"
	},
	{
		"id": 5006309,
		"name": "Paranaíba",
		"stateCode": "MS"
	},
	{
		"id": 5006358,
		"name": "Paranhos",
		"stateCode": "MS"
	},
	{
		"id": 5006408,
		"name": "Pedro Gomes",
		"stateCode": "MS"
	},
	{
		"id": 5006606,
		"name": "Ponta Porã",
		"stateCode": "MS"
	},
	{
		"id": 5006903,
		"name": "Porto Murtinho",
		"stateCode": "MS"
	},
	{
		"id": 5007109,
		"name": "Ribas do Rio Pardo",
		"stateCode": "MS"
	},
	{
		"id": 5007208,
		"name": "Rio Brilhante",
		"stateCode": "MS"
	},
	{
		"id": 5007307,
		"name": "Rio Negro",
		"stateCode": "MS"
	},
	{
		"id": 5007406,
		"name": "Rio Verde de Mato Grosso",
		"stateCode": "MS"
	},
	{
		"id": 5007505,
		"name": "Rochedo",
		"stateCode": "MS"
	},
	{
		"id": 5007554,
		"name": "Santa Rita do Pardo",
		"stateCode": "MS"
	},
	{
		"id": 5007695,
		"name": "São Gabriel do Oeste",
		"stateCode": "MS"
	},
	{
		"id": 5007802,
		"name": "Selvíria",
		"stateCode": "MS"
	},
	{
		"id": 5007703,
		"name": "Sete Quedas",
		"stateCode": "MS"
	},
	{
		"id": 5007901,
		"name": "Sidrolândia",
		"stateCode": "MS"
	},
	{
		"id": 5007935,
		"name": "Sonora",
		"stateCode": "MS"
	},
	{
		"id": 5007950,
		"name": "Tacuru",
		"stateCode": "MS"
	},
	{
		"id": 5007976,
		"name": "Taquarussu",
		"stateCode": "MS"
	},
	{
		"id": 5008008,
		"name": "Terenos",
		"stateCode": "MS"
	},
	{
		"id": 5008305,
		"name": "Três Lagoas",
		"stateCode": "MS"
	},
	{
		"id": 5008404,
		"name": "Vicentina",
		"stateCode": "MS"
	},
	{
		"id": 5100102,
		"name": "Acorizal",
		"stateCode": "MT"
	},
	{
		"id": 5100201,
		"name": "Água Boa",
		"stateCode": "MT"
	},
	{
		"id": 5100250,
		"name": "Alta Floresta",
		"stateCode": "MT"
	},
	{
		"id": 5100300,
		"name": "Alto Araguaia",
		"stateCode": "MT"
	},
	{
		"id": 5100359,
		"name": "Alto Boa Vista",
		"stateCode": "MT"
	},
	{
		"id": 5100409,
		"name": "Alto Garças",
		"stateCode": "MT"
	},
	{
		"id": 5100508,
		"name": "Alto Paraguai",
		"stateCode": "MT"
	},
	{
		"id": 5100607,
		"name": "Alto Taquari",
		"stateCode": "MT"
	},
	{
		"id": 5100805,
		"name": "Apiacás",
		"stateCode": "MT"
	},
	{
		"id": 5101001,
		"name": "Araguaiana",
		"stateCode": "MT"
	},
	{
		"id": 5101209,
		"name": "Araguainha",
		"stateCode": "MT"
	},
	{
		"id": 5101258,
		"name": "Araputanga",
		"stateCode": "MT"
	},
	{
		"id": 5101308,
		"name": "Arenápolis",
		"stateCode": "MT"
	},
	{
		"id": 5101407,
		"name": "Aripuanã",
		"stateCode": "MT"
	},
	{
		"id": 5101605,
		"name": "Barão de Melgaço",
		"stateCode": "MT"
	},
	{
		"id": 5101704,
		"name": "Barra do Bugres",
		"stateCode": "MT"
	},
	{
		"id": 5101803,
		"name": "Barra do Garças",
		"stateCode": "MT"
	},
	{
		"id": 5101837,
		"name": "Boa Esperança do Norte",
		"stateCode": "MT"
	},
	{
		"id": 5101852,
		"name": "Bom Jesus do Araguaia",
		"stateCode": "MT"
	},
	{
		"id": 5101902,
		"name": "Brasnorte",
		"stateCode": "MT"
	},
	{
		"id": 5102504,
		"name": "Cáceres",
		"stateCode": "MT"
	},
	{
		"id": 5102603,
		"name": "Campinápolis",
		"stateCode": "MT"
	},
	{
		"id": 5102637,
		"name": "Campo Novo do Parecis",
		"stateCode": "MT"
	},
	{
		"id": 5102678,
		"name": "Campo Verde",
		"stateCode": "MT"
	},
	{
		"id": 5102686,
		"name": "Campos de Júlio",
		"stateCode": "MT"
	},
	{
		"id": 5102694,
		"name": "Canabrava do Norte",
		"stateCode": "MT"
	},
	{
		"id": 5102702,
		"name": "Canarana",
		"stateCode": "MT"
	},
	{
		"id": 5102793,
		"name": "Carlinda",
		"stateCode": "MT"
	},
	{
		"id": 5102850,
		"name": "Castanheira",
		"stateCode": "MT"
	},
	{
		"id": 5103007,
		"name": "Chapada dos Guimarães",
		"stateCode": "MT"
	},
	{
		"id": 5103056,
		"name": "Cláudia",
		"stateCode": "MT"
	},
	{
		"id": 5103106,
		"name": "Cocalinho",
		"stateCode": "MT"
	},
	{
		"id": 5103205,
		"name": "Colíder",
		"stateCode": "MT"
	},
	{
		"id": 5103254,
		"name": "Colniza",
		"stateCode": "MT"
	},
	{
		"id": 5103304,
		"name": "Comodoro",
		"stateCode": "MT"
	},
	{
		"id": 5103353,
		"name": "Confresa",
		"stateCode": "MT"
	},
	{
		"id": 5103361,
		"name": "Conquista D'Oeste",
		"stateCode": "MT"
	},
	{
		"id": 5103379,
		"name": "Cotriguaçu",
		"stateCode": "MT"
	},
	{
		"id": 5103403,
		"name": "Cuiabá",
		"stateCode": "MT"
	},
	{
		"id": 5103437,
		"name": "Curvelândia",
		"stateCode": "MT"
	},
	{
		"id": 5103452,
		"name": "Denise",
		"stateCode": "MT"
	},
	{
		"id": 5103502,
		"name": "Diamantino",
		"stateCode": "MT"
	},
	{
		"id": 5103601,
		"name": "Dom Aquino",
		"stateCode": "MT"
	},
	{
		"id": 5103700,
		"name": "Feliz Natal",
		"stateCode": "MT"
	},
	{
		"id": 5103809,
		"name": "Figueirópolis D'Oeste",
		"stateCode": "MT"
	},
	{
		"id": 5103858,
		"name": "Gaúcha do Norte",
		"stateCode": "MT"
	},
	{
		"id": 5103908,
		"name": "General Carneiro",
		"stateCode": "MT"
	},
	{
		"id": 5103957,
		"name": "Glória D'Oeste",
		"stateCode": "MT"
	},
	{
		"id": 5104104,
		"name": "Guarantã do Norte",
		"stateCode": "MT"
	},
	{
		"id": 5104203,
		"name": "Guiratinga",
		"stateCode": "MT"
	},
	{
		"id": 5104500,
		"name": "Indiavaí",
		"stateCode": "MT"
	},
	{
		"id": 5104526,
		"name": "Ipiranga do Norte",
		"stateCode": "MT"
	},
	{
		"id": 5104542,
		"name": "Itanhangá",
		"stateCode": "MT"
	},
	{
		"id": 5104559,
		"name": "Itaúba",
		"stateCode": "MT"
	},
	{
		"id": 5104609,
		"name": "Itiquira",
		"stateCode": "MT"
	},
	{
		"id": 5104807,
		"name": "Jaciara",
		"stateCode": "MT"
	},
	{
		"id": 5104906,
		"name": "Jangada",
		"stateCode": "MT"
	},
	{
		"id": 5105002,
		"name": "Jauru",
		"stateCode": "MT"
	},
	{
		"id": 5105101,
		"name": "Juara",
		"stateCode": "MT"
	},
	{
		"id": 5105150,
		"name": "Juína",
		"stateCode": "MT"
	},
	{
		"id": 5105176,
		"name": "Juruena",
		"stateCode": "MT"
	},
	{
		"id": 5105200,
		"name": "Juscimeira",
		"stateCode": "MT"
	},
	{
		"id": 5105234,
		"name": "Lambari D'Oeste",
		"stateCode": "MT"
	},
	{
		"id": 5105259,
		"name": "Lucas do Rio Verde",
		"stateCode": "MT"
	},
	{
		"id": 5105309,
		"name": "Luciara",
		"stateCode": "MT"
	},
	{
		"id": 5105580,
		"name": "Marcelândia",
		"stateCode": "MT"
	},
	{
		"id": 5105606,
		"name": "Matupá",
		"stateCode": "MT"
	},
	{
		"id": 5105622,
		"name": "Mirassol d'Oeste",
		"stateCode": "MT"
	},
	{
		"id": 5105903,
		"name": "Nobres",
		"stateCode": "MT"
	},
	{
		"id": 5106000,
		"name": "Nortelândia",
		"stateCode": "MT"
	},
	{
		"id": 5106109,
		"name": "Nossa Senhora do Livramento",
		"stateCode": "MT"
	},
	{
		"id": 5106158,
		"name": "Nova Bandeirantes",
		"stateCode": "MT"
	},
	{
		"id": 5106208,
		"name": "Nova Brasilândia",
		"stateCode": "MT"
	},
	{
		"id": 5106216,
		"name": "Nova Canaã do Norte",
		"stateCode": "MT"
	},
	{
		"id": 5108808,
		"name": "Nova Guarita",
		"stateCode": "MT"
	},
	{
		"id": 5106182,
		"name": "Nova Lacerda",
		"stateCode": "MT"
	},
	{
		"id": 5108857,
		"name": "Nova Marilândia",
		"stateCode": "MT"
	},
	{
		"id": 5108907,
		"name": "Nova Maringá",
		"stateCode": "MT"
	},
	{
		"id": 5108956,
		"name": "Nova Monte Verde",
		"stateCode": "MT"
	},
	{
		"id": 5106224,
		"name": "Nova Mutum",
		"stateCode": "MT"
	},
	{
		"id": 5106174,
		"name": "Nova Nazaré",
		"stateCode": "MT"
	},
	{
		"id": 5106232,
		"name": "Nova Olímpia",
		"stateCode": "MT"
	},
	{
		"id": 5106190,
		"name": "Nova Santa Helena",
		"stateCode": "MT"
	},
	{
		"id": 5106240,
		"name": "Nova Ubiratã",
		"stateCode": "MT"
	},
	{
		"id": 5106257,
		"name": "Nova Xavantina",
		"stateCode": "MT"
	},
	{
		"id": 5106273,
		"name": "Novo Horizonte do Norte",
		"stateCode": "MT"
	},
	{
		"id": 5106265,
		"name": "Novo Mundo",
		"stateCode": "MT"
	},
	{
		"id": 5106315,
		"name": "Novo Santo Antônio",
		"stateCode": "MT"
	},
	{
		"id": 5106281,
		"name": "Novo São Joaquim",
		"stateCode": "MT"
	},
	{
		"id": 5106299,
		"name": "Paranaíta",
		"stateCode": "MT"
	},
	{
		"id": 5106307,
		"name": "Paranatinga",
		"stateCode": "MT"
	},
	{
		"id": 5106372,
		"name": "Pedra Preta",
		"stateCode": "MT"
	},
	{
		"id": 5106422,
		"name": "Peixoto de Azevedo",
		"stateCode": "MT"
	},
	{
		"id": 5106455,
		"name": "Planalto da Serra",
		"stateCode": "MT"
	},
	{
		"id": 5106505,
		"name": "Poconé",
		"stateCode": "MT"
	},
	{
		"id": 5106653,
		"name": "Pontal do Araguaia",
		"stateCode": "MT"
	},
	{
		"id": 5106703,
		"name": "Ponte Branca",
		"stateCode": "MT"
	},
	{
		"id": 5106752,
		"name": "Pontes e Lacerda",
		"stateCode": "MT"
	},
	{
		"id": 5106778,
		"name": "Porto Alegre do Norte",
		"stateCode": "MT"
	},
	{
		"id": 5106802,
		"name": "Porto dos Gaúchos",
		"stateCode": "MT"
	},
	{
		"id": 5106828,
		"name": "Porto Esperidião",
		"stateCode": "MT"
	},
	{
		"id": 5106851,
		"name": "Porto Estrela",
		"stateCode": "MT"
	},
	{
		"id": 5107008,
		"name": "Poxoréu",
		"stateCode": "MT"
	},
	{
		"id": 5107040,
		"name": "Primavera do Leste",
		"stateCode": "MT"
	},
	{
		"id": 5107065,
		"name": "Querência",
		"stateCode": "MT"
	},
	{
		"id": 5107156,
		"name": "Reserva do Cabaçal",
		"stateCode": "MT"
	},
	{
		"id": 5107180,
		"name": "Ribeirão Cascalheira",
		"stateCode": "MT"
	},
	{
		"id": 5107198,
		"name": "Ribeirãozinho",
		"stateCode": "MT"
	},
	{
		"id": 5107206,
		"name": "Rio Branco",
		"stateCode": "MT"
	},
	{
		"id": 5107578,
		"name": "Rondolândia",
		"stateCode": "MT"
	},
	{
		"id": 5107602,
		"name": "Rondonópolis",
		"stateCode": "MT"
	},
	{
		"id": 5107701,
		"name": "Rosário Oeste",
		"stateCode": "MT"
	},
	{
		"id": 5107750,
		"name": "Salto do Céu",
		"stateCode": "MT"
	},
	{
		"id": 5107248,
		"name": "Santa Carmem",
		"stateCode": "MT"
	},
	{
		"id": 5107743,
		"name": "Santa Cruz do Xingu",
		"stateCode": "MT"
	},
	{
		"id": 5107768,
		"name": "Santa Rita do Trivelato",
		"stateCode": "MT"
	},
	{
		"id": 5107776,
		"name": "Santa Terezinha",
		"stateCode": "MT"
	},
	{
		"id": 5107263,
		"name": "Santo Afonso",
		"stateCode": "MT"
	},
	{
		"id": 5107800,
		"name": "Santo Antônio de Leverger",
		"stateCode": "MT"
	},
	{
		"id": 5107792,
		"name": "Santo Antônio do Leste",
		"stateCode": "MT"
	},
	{
		"id": 5107859,
		"name": "São Félix do Araguaia",
		"stateCode": "MT"
	},
	{
		"id": 5107297,
		"name": "São José do Povo",
		"stateCode": "MT"
	},
	{
		"id": 5107305,
		"name": "São José do Rio Claro",
		"stateCode": "MT"
	},
	{
		"id": 5107354,
		"name": "São José do Xingu",
		"stateCode": "MT"
	},
	{
		"id": 5107107,
		"name": "São José dos Quatro Marcos",
		"stateCode": "MT"
	},
	{
		"id": 5107404,
		"name": "São Pedro da Cipa",
		"stateCode": "MT"
	},
	{
		"id": 5107875,
		"name": "Sapezal",
		"stateCode": "MT"
	},
	{
		"id": 5107883,
		"name": "Serra Nova Dourada",
		"stateCode": "MT"
	},
	{
		"id": 5107909,
		"name": "Sinop",
		"stateCode": "MT"
	},
	{
		"id": 5107925,
		"name": "Sorriso",
		"stateCode": "MT"
	},
	{
		"id": 5107941,
		"name": "Tabaporã",
		"stateCode": "MT"
	},
	{
		"id": 5107958,
		"name": "Tangará da Serra",
		"stateCode": "MT"
	},
	{
		"id": 5108006,
		"name": "Tapurah",
		"stateCode": "MT"
	},
	{
		"id": 5108055,
		"name": "Terra Nova do Norte",
		"stateCode": "MT"
	},
	{
		"id": 5108105,
		"name": "Tesouro",
		"stateCode": "MT"
	},
	{
		"id": 5108204,
		"name": "Torixoréu",
		"stateCode": "MT"
	},
	{
		"id": 5108303,
		"name": "União do Sul",
		"stateCode": "MT"
	},
	{
		"id": 5108352,
		"name": "Vale de São Domingos",
		"stateCode": "MT"
	},
	{
		"id": 5108402,
		"name": "Várzea Grande",
		"stateCode": "MT"
	},
	{
		"id": 5108501,
		"name": "Vera",
		"stateCode": "MT"
	},
	{
		"id": 5105507,
		"name": "Vila Bela da Santíssima Trindade",
		"stateCode": "MT"
	},
	{
		"id": 5108600,
		"name": "Vila Rica",
		"stateCode": "MT"
	},
	{
		"id": 1500107,
		"name": "Abaetetuba",
		"stateCode": "PA"
	},
	{
		"id": 1500131,
		"name": "Abel Figueiredo",
		"stateCode": "PA"
	},
	{
		"id": 1500206,
		"name": "Acará",
		"stateCode": "PA"
	},
	{
		"id": 1500305,
		"name": "Afuá",
		"stateCode": "PA"
	},
	{
		"id": 1500347,
		"name": "Água Azul do Norte",
		"stateCode": "PA"
	},
	{
		"id": 1500404,
		"name": "Alenquer",
		"stateCode": "PA"
	},
	{
		"id": 1500503,
		"name": "Almeirim",
		"stateCode": "PA"
	},
	{
		"id": 1500602,
		"name": "Altamira",
		"stateCode": "PA"
	},
	{
		"id": 1500701,
		"name": "Anajás",
		"stateCode": "PA"
	},
	{
		"id": 1500800,
		"name": "Ananindeua",
		"stateCode": "PA"
	},
	{
		"id": 1500859,
		"name": "Anapu",
		"stateCode": "PA"
	},
	{
		"id": 1500909,
		"name": "Augusto Corrêa",
		"stateCode": "PA"
	},
	{
		"id": 1500958,
		"name": "Aurora do Pará",
		"stateCode": "PA"
	},
	{
		"id": 1501006,
		"name": "Aveiro",
		"stateCode": "PA"
	},
	{
		"id": 1501105,
		"name": "Bagre",
		"stateCode": "PA"
	},
	{
		"id": 1501204,
		"name": "Baião",
		"stateCode": "PA"
	},
	{
		"id": 1501253,
		"name": "Bannach",
		"stateCode": "PA"
	},
	{
		"id": 1501303,
		"name": "Barcarena",
		"stateCode": "PA"
	},
	{
		"id": 1501402,
		"name": "Belém",
		"stateCode": "PA"
	},
	{
		"id": 1501451,
		"name": "Belterra",
		"stateCode": "PA"
	},
	{
		"id": 1501501,
		"name": "Benevides",
		"stateCode": "PA"
	},
	{
		"id": 1501576,
		"name": "Bom Jesus do Tocantins",
		"stateCode": "PA"
	},
	{
		"id": 1501600,
		"name": "Bonito",
		"stateCode": "PA"
	},
	{
		"id": 1501709,
		"name": "Bragança",
		"stateCode": "PA"
	},
	{
		"id": 1501725,
		"name": "Brasil Novo",
		"stateCode": "PA"
	},
	{
		"id": 1501758,
		"name": "Brejo Grande do Araguaia",
		"stateCode": "PA"
	},
	{
		"id": 1501782,
		"name": "Breu Branco",
		"stateCode": "PA"
	},
	{
		"id": 1501808,
		"name": "Breves",
		"stateCode": "PA"
	},
	{
		"id": 1501907,
		"name": "Bujaru",
		"stateCode": "PA"
	},
	{
		"id": 1502004,
		"name": "Cachoeira do Arari",
		"stateCode": "PA"
	},
	{
		"id": 1501956,
		"name": "Cachoeira do Piriá",
		"stateCode": "PA"
	},
	{
		"id": 1502103,
		"name": "Cametá",
		"stateCode": "PA"
	},
	{
		"id": 1502152,
		"name": "Canaã dos Carajás",
		"stateCode": "PA"
	},
	{
		"id": 1502202,
		"name": "Capanema",
		"stateCode": "PA"
	},
	{
		"id": 1502301,
		"name": "Capitão Poço",
		"stateCode": "PA"
	},
	{
		"id": 1502400,
		"name": "Castanhal",
		"stateCode": "PA"
	},
	{
		"id": 1502509,
		"name": "Chaves",
		"stateCode": "PA"
	},
	{
		"id": 1502608,
		"name": "Colares",
		"stateCode": "PA"
	},
	{
		"id": 1502707,
		"name": "Conceição do Araguaia",
		"stateCode": "PA"
	},
	{
		"id": 1502756,
		"name": "Concórdia do Pará",
		"stateCode": "PA"
	},
	{
		"id": 1502764,
		"name": "Cumaru do Norte",
		"stateCode": "PA"
	},
	{
		"id": 1502772,
		"name": "Curionópolis",
		"stateCode": "PA"
	},
	{
		"id": 1502806,
		"name": "Curralinho",
		"stateCode": "PA"
	},
	{
		"id": 1502855,
		"name": "Curuá",
		"stateCode": "PA"
	},
	{
		"id": 1502905,
		"name": "Curuçá",
		"stateCode": "PA"
	},
	{
		"id": 1502939,
		"name": "Dom Eliseu",
		"stateCode": "PA"
	},
	{
		"id": 1502954,
		"name": "Eldorado do Carajás",
		"stateCode": "PA"
	},
	{
		"id": 1503002,
		"name": "Faro",
		"stateCode": "PA"
	},
	{
		"id": 1503044,
		"name": "Floresta do Araguaia",
		"stateCode": "PA"
	},
	{
		"id": 1503077,
		"name": "Garrafão do Norte",
		"stateCode": "PA"
	},
	{
		"id": 1503093,
		"name": "Goianésia do Pará",
		"stateCode": "PA"
	},
	{
		"id": 1503101,
		"name": "Gurupá",
		"stateCode": "PA"
	},
	{
		"id": 1503200,
		"name": "Igarapé-Açu",
		"stateCode": "PA"
	},
	{
		"id": 1503309,
		"name": "Igarapé-Miri",
		"stateCode": "PA"
	},
	{
		"id": 1503408,
		"name": "Inhangapi",
		"stateCode": "PA"
	},
	{
		"id": 1503457,
		"name": "Ipixuna do Pará",
		"stateCode": "PA"
	},
	{
		"id": 1503507,
		"name": "Irituia",
		"stateCode": "PA"
	},
	{
		"id": 1503606,
		"name": "Itaituba",
		"stateCode": "PA"
	},
	{
		"id": 1503705,
		"name": "Itupiranga",
		"stateCode": "PA"
	},
	{
		"id": 1503754,
		"name": "Jacareacanga",
		"stateCode": "PA"
	},
	{
		"id": 1503804,
		"name": "Jacundá",
		"stateCode": "PA"
	},
	{
		"id": 1503903,
		"name": "Juruti",
		"stateCode": "PA"
	},
	{
		"id": 1504000,
		"name": "Limoeiro do Ajuru",
		"stateCode": "PA"
	},
	{
		"id": 1504059,
		"name": "Mãe do Rio",
		"stateCode": "PA"
	},
	{
		"id": 1504109,
		"name": "Magalhães Barata",
		"stateCode": "PA"
	},
	{
		"id": 1504208,
		"name": "Marabá",
		"stateCode": "PA"
	},
	{
		"id": 1504307,
		"name": "Maracanã",
		"stateCode": "PA"
	},
	{
		"id": 1504406,
		"name": "Marapanim",
		"stateCode": "PA"
	},
	{
		"id": 1504422,
		"name": "Marituba",
		"stateCode": "PA"
	},
	{
		"id": 1504455,
		"name": "Medicilândia",
		"stateCode": "PA"
	},
	{
		"id": 1504505,
		"name": "Melgaço",
		"stateCode": "PA"
	},
	{
		"id": 1504604,
		"name": "Mocajuba",
		"stateCode": "PA"
	},
	{
		"id": 1504703,
		"name": "Moju",
		"stateCode": "PA"
	},
	{
		"id": 1504752,
		"name": "Mojuí dos Campos",
		"stateCode": "PA"
	},
	{
		"id": 1504802,
		"name": "Monte Alegre",
		"stateCode": "PA"
	},
	{
		"id": 1504901,
		"name": "Muaná",
		"stateCode": "PA"
	},
	{
		"id": 1504950,
		"name": "Nova Esperança do Piriá",
		"stateCode": "PA"
	},
	{
		"id": 1504976,
		"name": "Nova Ipixuna",
		"stateCode": "PA"
	},
	{
		"id": 1505007,
		"name": "Nova Timboteua",
		"stateCode": "PA"
	},
	{
		"id": 1505031,
		"name": "Novo Progresso",
		"stateCode": "PA"
	},
	{
		"id": 1505064,
		"name": "Novo Repartimento",
		"stateCode": "PA"
	},
	{
		"id": 1505106,
		"name": "Óbidos",
		"stateCode": "PA"
	},
	{
		"id": 1505205,
		"name": "Oeiras do Pará",
		"stateCode": "PA"
	},
	{
		"id": 1505304,
		"name": "Oriximiná",
		"stateCode": "PA"
	},
	{
		"id": 1505403,
		"name": "Ourém",
		"stateCode": "PA"
	},
	{
		"id": 1505437,
		"name": "Ourilândia do Norte",
		"stateCode": "PA"
	},
	{
		"id": 1505486,
		"name": "Pacajá",
		"stateCode": "PA"
	},
	{
		"id": 1505494,
		"name": "Palestina do Pará",
		"stateCode": "PA"
	},
	{
		"id": 1505502,
		"name": "Paragominas",
		"stateCode": "PA"
	},
	{
		"id": 1505536,
		"name": "Parauapebas",
		"stateCode": "PA"
	},
	{
		"id": 1505551,
		"name": "Pau D'Arco",
		"stateCode": "PA"
	},
	{
		"id": 1505601,
		"name": "Peixe-Boi",
		"stateCode": "PA"
	},
	{
		"id": 1505635,
		"name": "Piçarra",
		"stateCode": "PA"
	},
	{
		"id": 1505650,
		"name": "Placas",
		"stateCode": "PA"
	},
	{
		"id": 1505700,
		"name": "Ponta de Pedras",
		"stateCode": "PA"
	},
	{
		"id": 1505809,
		"name": "Portel",
		"stateCode": "PA"
	},
	{
		"id": 1505908,
		"name": "Porto de Moz",
		"stateCode": "PA"
	},
	{
		"id": 1506005,
		"name": "Prainha",
		"stateCode": "PA"
	},
	{
		"id": 1506104,
		"name": "Primavera",
		"stateCode": "PA"
	},
	{
		"id": 1506112,
		"name": "Quatipuru",
		"stateCode": "PA"
	},
	{
		"id": 1506138,
		"name": "Redenção",
		"stateCode": "PA"
	},
	{
		"id": 1506161,
		"name": "Rio Maria",
		"stateCode": "PA"
	},
	{
		"id": 1506187,
		"name": "Rondon do Pará",
		"stateCode": "PA"
	},
	{
		"id": 1506195,
		"name": "Rurópolis",
		"stateCode": "PA"
	},
	{
		"id": 1506203,
		"name": "Salinópolis",
		"stateCode": "PA"
	},
	{
		"id": 1506302,
		"name": "Salvaterra",
		"stateCode": "PA"
	},
	{
		"id": 1506351,
		"name": "Santa Bárbara do Pará",
		"stateCode": "PA"
	},
	{
		"id": 1506401,
		"name": "Santa Cruz do Arari",
		"stateCode": "PA"
	},
	{
		"id": 1506500,
		"name": "Santa Izabel do Pará",
		"stateCode": "PA"
	},
	{
		"id": 1506559,
		"name": "Santa Luzia do Pará",
		"stateCode": "PA"
	},
	{
		"id": 1506583,
		"name": "Santa Maria das Barreiras",
		"stateCode": "PA"
	},
	{
		"id": 1506609,
		"name": "Santa Maria do Pará",
		"stateCode": "PA"
	},
	{
		"id": 1506708,
		"name": "Santana do Araguaia",
		"stateCode": "PA"
	},
	{
		"id": 1506807,
		"name": "Santarém",
		"stateCode": "PA"
	},
	{
		"id": 1506906,
		"name": "Santarém Novo",
		"stateCode": "PA"
	},
	{
		"id": 1507003,
		"name": "Santo Antônio do Tauá",
		"stateCode": "PA"
	},
	{
		"id": 1507102,
		"name": "São Caetano de Odivelas",
		"stateCode": "PA"
	},
	{
		"id": 1507151,
		"name": "São Domingos do Araguaia",
		"stateCode": "PA"
	},
	{
		"id": 1507201,
		"name": "São Domingos do Capim",
		"stateCode": "PA"
	},
	{
		"id": 1507300,
		"name": "São Félix do Xingu",
		"stateCode": "PA"
	},
	{
		"id": 1507409,
		"name": "São Francisco do Pará",
		"stateCode": "PA"
	},
	{
		"id": 1507458,
		"name": "São Geraldo do Araguaia",
		"stateCode": "PA"
	},
	{
		"id": 1507466,
		"name": "São João da Ponta",
		"stateCode": "PA"
	},
	{
		"id": 1507474,
		"name": "São João de Pirabas",
		"stateCode": "PA"
	},
	{
		"id": 1507508,
		"name": "São João do Araguaia",
		"stateCode": "PA"
	},
	{
		"id": 1507607,
		"name": "São Miguel do Guamá",
		"stateCode": "PA"
	},
	{
		"id": 1507706,
		"name": "São Sebastião da Boa Vista",
		"stateCode": "PA"
	},
	{
		"id": 1507755,
		"name": "Sapucaia",
		"stateCode": "PA"
	},
	{
		"id": 1507805,
		"name": "Senador José Porfírio",
		"stateCode": "PA"
	},
	{
		"id": 1507904,
		"name": "Soure",
		"stateCode": "PA"
	},
	{
		"id": 1507953,
		"name": "Tailândia",
		"stateCode": "PA"
	},
	{
		"id": 1507961,
		"name": "Terra Alta",
		"stateCode": "PA"
	},
	{
		"id": 1507979,
		"name": "Terra Santa",
		"stateCode": "PA"
	},
	{
		"id": 1508001,
		"name": "Tomé-Açu",
		"stateCode": "PA"
	},
	{
		"id": 1508035,
		"name": "Tracuateua",
		"stateCode": "PA"
	},
	{
		"id": 1508050,
		"name": "Trairão",
		"stateCode": "PA"
	},
	{
		"id": 1508084,
		"name": "Tucumã",
		"stateCode": "PA"
	},
	{
		"id": 1508100,
		"name": "Tucuruí",
		"stateCode": "PA"
	},
	{
		"id": 1508126,
		"name": "Ulianópolis",
		"stateCode": "PA"
	},
	{
		"id": 1508159,
		"name": "Uruará",
		"stateCode": "PA"
	},
	{
		"id": 1508209,
		"name": "Vigia",
		"stateCode": "PA"
	},
	{
		"id": 1508308,
		"name": "Viseu",
		"stateCode": "PA"
	},
	{
		"id": 1508357,
		"name": "Vitória do Xingu",
		"stateCode": "PA"
	},
	{
		"id": 1508407,
		"name": "Xinguara",
		"stateCode": "PA"
	},
	{
		"id": 2500106,
		"name": "Água Branca",
		"stateCode": "PB"
	},
	{
		"id": 2500205,
		"name": "Aguiar",
		"stateCode": "PB"
	},
	{
		"id": 2500304,
		"name": "Alagoa Grande",
		"stateCode": "PB"
	},
	{
		"id": 2500403,
		"name": "Alagoa Nova",
		"stateCode": "PB"
	},
	{
		"id": 2500502,
		"name": "Alagoinha",
		"stateCode": "PB"
	},
	{
		"id": 2500536,
		"name": "Alcantil",
		"stateCode": "PB"
	},
	{
		"id": 2500577,
		"name": "Algodão de Jandaíra",
		"stateCode": "PB"
	},
	{
		"id": 2500601,
		"name": "Alhandra",
		"stateCode": "PB"
	},
	{
		"id": 2500734,
		"name": "Amparo",
		"stateCode": "PB"
	},
	{
		"id": 2500775,
		"name": "Aparecida",
		"stateCode": "PB"
	},
	{
		"id": 2500809,
		"name": "Araçagi",
		"stateCode": "PB"
	},
	{
		"id": 2500908,
		"name": "Arara",
		"stateCode": "PB"
	},
	{
		"id": 2501005,
		"name": "Araruna",
		"stateCode": "PB"
	},
	{
		"id": 2501104,
		"name": "Areia",
		"stateCode": "PB"
	},
	{
		"id": 2501153,
		"name": "Areia de Baraúnas",
		"stateCode": "PB"
	},
	{
		"id": 2501203,
		"name": "Areial",
		"stateCode": "PB"
	},
	{
		"id": 2501302,
		"name": "Aroeiras",
		"stateCode": "PB"
	},
	{
		"id": 2501351,
		"name": "Assunção",
		"stateCode": "PB"
	},
	{
		"id": 2501401,
		"name": "Baía da Traição",
		"stateCode": "PB"
	},
	{
		"id": 2501500,
		"name": "Bananeiras",
		"stateCode": "PB"
	},
	{
		"id": 2501534,
		"name": "Baraúna",
		"stateCode": "PB"
	},
	{
		"id": 2501609,
		"name": "Barra de Santa Rosa",
		"stateCode": "PB"
	},
	{
		"id": 2501575,
		"name": "Barra de Santana",
		"stateCode": "PB"
	},
	{
		"id": 2501708,
		"name": "Barra de São Miguel",
		"stateCode": "PB"
	},
	{
		"id": 2501807,
		"name": "Bayeux",
		"stateCode": "PB"
	},
	{
		"id": 2501906,
		"name": "Belém",
		"stateCode": "PB"
	},
	{
		"id": 2502003,
		"name": "Belém do Brejo do Cruz",
		"stateCode": "PB"
	},
	{
		"id": 2502052,
		"name": "Bernardino Batista",
		"stateCode": "PB"
	},
	{
		"id": 2502102,
		"name": "Boa Ventura",
		"stateCode": "PB"
	},
	{
		"id": 2502151,
		"name": "Boa Vista",
		"stateCode": "PB"
	},
	{
		"id": 2502201,
		"name": "Bom Jesus",
		"stateCode": "PB"
	},
	{
		"id": 2502300,
		"name": "Bom Sucesso",
		"stateCode": "PB"
	},
	{
		"id": 2502409,
		"name": "Bonito de Santa Fé",
		"stateCode": "PB"
	},
	{
		"id": 2502508,
		"name": "Boqueirão",
		"stateCode": "PB"
	},
	{
		"id": 2502706,
		"name": "Borborema",
		"stateCode": "PB"
	},
	{
		"id": 2502805,
		"name": "Brejo do Cruz",
		"stateCode": "PB"
	},
	{
		"id": 2502904,
		"name": "Brejo dos Santos",
		"stateCode": "PB"
	},
	{
		"id": 2503001,
		"name": "Caaporã",
		"stateCode": "PB"
	},
	{
		"id": 2503100,
		"name": "Cabaceiras",
		"stateCode": "PB"
	},
	{
		"id": 2503209,
		"name": "Cabedelo",
		"stateCode": "PB"
	},
	{
		"id": 2503308,
		"name": "Cachoeira dos Índios",
		"stateCode": "PB"
	},
	{
		"id": 2503407,
		"name": "Cacimba de Areia",
		"stateCode": "PB"
	},
	{
		"id": 2503506,
		"name": "Cacimba de Dentro",
		"stateCode": "PB"
	},
	{
		"id": 2503555,
		"name": "Cacimbas",
		"stateCode": "PB"
	},
	{
		"id": 2503605,
		"name": "Caiçara",
		"stateCode": "PB"
	},
	{
		"id": 2503704,
		"name": "Cajazeiras",
		"stateCode": "PB"
	},
	{
		"id": 2503753,
		"name": "Cajazeirinhas",
		"stateCode": "PB"
	},
	{
		"id": 2503803,
		"name": "Caldas Brandão",
		"stateCode": "PB"
	},
	{
		"id": 2503902,
		"name": "Camalaú",
		"stateCode": "PB"
	},
	{
		"id": 2504009,
		"name": "Campina Grande",
		"stateCode": "PB"
	},
	{
		"id": 2504033,
		"name": "Capim",
		"stateCode": "PB"
	},
	{
		"id": 2504074,
		"name": "Caraúbas",
		"stateCode": "PB"
	},
	{
		"id": 2504108,
		"name": "Carrapateira",
		"stateCode": "PB"
	},
	{
		"id": 2504157,
		"name": "Casserengue",
		"stateCode": "PB"
	},
	{
		"id": 2504207,
		"name": "Catingueira",
		"stateCode": "PB"
	},
	{
		"id": 2504306,
		"name": "Catolé do Rocha",
		"stateCode": "PB"
	},
	{
		"id": 2504355,
		"name": "Caturité",
		"stateCode": "PB"
	},
	{
		"id": 2504405,
		"name": "Conceição",
		"stateCode": "PB"
	},
	{
		"id": 2504504,
		"name": "Condado",
		"stateCode": "PB"
	},
	{
		"id": 2504603,
		"name": "Conde",
		"stateCode": "PB"
	},
	{
		"id": 2504702,
		"name": "Congo",
		"stateCode": "PB"
	},
	{
		"id": 2504801,
		"name": "Coremas",
		"stateCode": "PB"
	},
	{
		"id": 2504850,
		"name": "Coxixola",
		"stateCode": "PB"
	},
	{
		"id": 2504900,
		"name": "Cruz do Espírito Santo",
		"stateCode": "PB"
	},
	{
		"id": 2505006,
		"name": "Cubati",
		"stateCode": "PB"
	},
	{
		"id": 2505105,
		"name": "Cuité",
		"stateCode": "PB"
	},
	{
		"id": 2505238,
		"name": "Cuité de Mamanguape",
		"stateCode": "PB"
	},
	{
		"id": 2505204,
		"name": "Cuitegi",
		"stateCode": "PB"
	},
	{
		"id": 2505279,
		"name": "Curral de Cima",
		"stateCode": "PB"
	},
	{
		"id": 2505303,
		"name": "Curral Velho",
		"stateCode": "PB"
	},
	{
		"id": 2505352,
		"name": "Damião",
		"stateCode": "PB"
	},
	{
		"id": 2505402,
		"name": "Desterro",
		"stateCode": "PB"
	},
	{
		"id": 2505600,
		"name": "Diamante",
		"stateCode": "PB"
	},
	{
		"id": 2505709,
		"name": "Dona Inês",
		"stateCode": "PB"
	},
	{
		"id": 2505808,
		"name": "Duas Estradas",
		"stateCode": "PB"
	},
	{
		"id": 2505907,
		"name": "Emas",
		"stateCode": "PB"
	},
	{
		"id": 2506004,
		"name": "Esperança",
		"stateCode": "PB"
	},
	{
		"id": 2506103,
		"name": "Fagundes",
		"stateCode": "PB"
	},
	{
		"id": 2506202,
		"name": "Frei Martinho",
		"stateCode": "PB"
	},
	{
		"id": 2506251,
		"name": "Gado Bravo",
		"stateCode": "PB"
	},
	{
		"id": 2506301,
		"name": "Guarabira",
		"stateCode": "PB"
	},
	{
		"id": 2506400,
		"name": "Gurinhém",
		"stateCode": "PB"
	},
	{
		"id": 2506509,
		"name": "Gurjão",
		"stateCode": "PB"
	},
	{
		"id": 2506608,
		"name": "Ibiara",
		"stateCode": "PB"
	},
	{
		"id": 2502607,
		"name": "Igaracy",
		"stateCode": "PB"
	},
	{
		"id": 2506707,
		"name": "Imaculada",
		"stateCode": "PB"
	},
	{
		"id": 2506806,
		"name": "Ingá",
		"stateCode": "PB"
	},
	{
		"id": 2506905,
		"name": "Itabaiana",
		"stateCode": "PB"
	},
	{
		"id": 2507002,
		"name": "Itaporanga",
		"stateCode": "PB"
	},
	{
		"id": 2507101,
		"name": "Itapororoca",
		"stateCode": "PB"
	},
	{
		"id": 2507200,
		"name": "Itatuba",
		"stateCode": "PB"
	},
	{
		"id": 2507309,
		"name": "Jacaraú",
		"stateCode": "PB"
	},
	{
		"id": 2507408,
		"name": "Jericó",
		"stateCode": "PB"
	},
	{
		"id": 2507507,
		"name": "João Pessoa",
		"stateCode": "PB"
	},
	{
		"id": 2513653,
		"name": "Joca Claudino",
		"stateCode": "PB"
	},
	{
		"id": 2507606,
		"name": "Juarez Távora",
		"stateCode": "PB"
	},
	{
		"id": 2507705,
		"name": "Juazeirinho",
		"stateCode": "PB"
	},
	{
		"id": 2507804,
		"name": "Junco do Seridó",
		"stateCode": "PB"
	},
	{
		"id": 2507903,
		"name": "Juripiranga",
		"stateCode": "PB"
	},
	{
		"id": 2508000,
		"name": "Juru",
		"stateCode": "PB"
	},
	{
		"id": 2508109,
		"name": "Lagoa",
		"stateCode": "PB"
	},
	{
		"id": 2508208,
		"name": "Lagoa de Dentro",
		"stateCode": "PB"
	},
	{
		"id": 2508307,
		"name": "Lagoa Seca",
		"stateCode": "PB"
	},
	{
		"id": 2508406,
		"name": "Lastro",
		"stateCode": "PB"
	},
	{
		"id": 2508505,
		"name": "Livramento",
		"stateCode": "PB"
	},
	{
		"id": 2508554,
		"name": "Logradouro",
		"stateCode": "PB"
	},
	{
		"id": 2508604,
		"name": "Lucena",
		"stateCode": "PB"
	},
	{
		"id": 2508703,
		"name": "Mãe d'Água",
		"stateCode": "PB"
	},
	{
		"id": 2508802,
		"name": "Malta",
		"stateCode": "PB"
	},
	{
		"id": 2508901,
		"name": "Mamanguape",
		"stateCode": "PB"
	},
	{
		"id": 2509008,
		"name": "Manaíra",
		"stateCode": "PB"
	},
	{
		"id": 2509057,
		"name": "Marcação",
		"stateCode": "PB"
	},
	{
		"id": 2509107,
		"name": "Mari",
		"stateCode": "PB"
	},
	{
		"id": 2509156,
		"name": "Marizópolis",
		"stateCode": "PB"
	},
	{
		"id": 2509206,
		"name": "Massaranduba",
		"stateCode": "PB"
	},
	{
		"id": 2509305,
		"name": "Mataraca",
		"stateCode": "PB"
	},
	{
		"id": 2509339,
		"name": "Matinhas",
		"stateCode": "PB"
	},
	{
		"id": 2509370,
		"name": "Mato Grosso",
		"stateCode": "PB"
	},
	{
		"id": 2509396,
		"name": "Maturéia",
		"stateCode": "PB"
	},
	{
		"id": 2509404,
		"name": "Mogeiro",
		"stateCode": "PB"
	},
	{
		"id": 2509503,
		"name": "Montadas",
		"stateCode": "PB"
	},
	{
		"id": 2509602,
		"name": "Monte Horebe",
		"stateCode": "PB"
	},
	{
		"id": 2509701,
		"name": "Monteiro",
		"stateCode": "PB"
	},
	{
		"id": 2509800,
		"name": "Mulungu",
		"stateCode": "PB"
	},
	{
		"id": 2509909,
		"name": "Natuba",
		"stateCode": "PB"
	},
	{
		"id": 2510006,
		"name": "Nazarezinho",
		"stateCode": "PB"
	},
	{
		"id": 2510105,
		"name": "Nova Floresta",
		"stateCode": "PB"
	},
	{
		"id": 2510204,
		"name": "Nova Olinda",
		"stateCode": "PB"
	},
	{
		"id": 2510303,
		"name": "Nova Palmeira",
		"stateCode": "PB"
	},
	{
		"id": 2510402,
		"name": "Olho d'Água",
		"stateCode": "PB"
	},
	{
		"id": 2510501,
		"name": "Olivedos",
		"stateCode": "PB"
	},
	{
		"id": 2510600,
		"name": "Ouro Velho",
		"stateCode": "PB"
	},
	{
		"id": 2510659,
		"name": "Parari",
		"stateCode": "PB"
	},
	{
		"id": 2510709,
		"name": "Passagem",
		"stateCode": "PB"
	},
	{
		"id": 2510808,
		"name": "Patos",
		"stateCode": "PB"
	},
	{
		"id": 2510907,
		"name": "Paulista",
		"stateCode": "PB"
	},
	{
		"id": 2511004,
		"name": "Pedra Branca",
		"stateCode": "PB"
	},
	{
		"id": 2511103,
		"name": "Pedra Lavrada",
		"stateCode": "PB"
	},
	{
		"id": 2511202,
		"name": "Pedras de Fogo",
		"stateCode": "PB"
	},
	{
		"id": 2512721,
		"name": "Pedro Régis",
		"stateCode": "PB"
	},
	{
		"id": 2511301,
		"name": "Piancó",
		"stateCode": "PB"
	},
	{
		"id": 2511400,
		"name": "Picuí",
		"stateCode": "PB"
	},
	{
		"id": 2511509,
		"name": "Pilar",
		"stateCode": "PB"
	},
	{
		"id": 2511608,
		"name": "Pilões",
		"stateCode": "PB"
	},
	{
		"id": 2511707,
		"name": "Pilõezinhos",
		"stateCode": "PB"
	},
	{
		"id": 2511806,
		"name": "Pirpirituba",
		"stateCode": "PB"
	},
	{
		"id": 2511905,
		"name": "Pitimbu",
		"stateCode": "PB"
	},
	{
		"id": 2512002,
		"name": "Pocinhos",
		"stateCode": "PB"
	},
	{
		"id": 2512036,
		"name": "Poço Dantas",
		"stateCode": "PB"
	},
	{
		"id": 2512077,
		"name": "Poço de José de Moura",
		"stateCode": "PB"
	},
	{
		"id": 2512101,
		"name": "Pombal",
		"stateCode": "PB"
	},
	{
		"id": 2512200,
		"name": "Prata",
		"stateCode": "PB"
	},
	{
		"id": 2512309,
		"name": "Princesa Isabel",
		"stateCode": "PB"
	},
	{
		"id": 2512408,
		"name": "Puxinanã",
		"stateCode": "PB"
	},
	{
		"id": 2512507,
		"name": "Queimadas",
		"stateCode": "PB"
	},
	{
		"id": 2512606,
		"name": "Quixaba",
		"stateCode": "PB"
	},
	{
		"id": 2512705,
		"name": "Remígio",
		"stateCode": "PB"
	},
	{
		"id": 2512747,
		"name": "Riachão",
		"stateCode": "PB"
	},
	{
		"id": 2512754,
		"name": "Riachão do Bacamarte",
		"stateCode": "PB"
	},
	{
		"id": 2512762,
		"name": "Riachão do Poço",
		"stateCode": "PB"
	},
	{
		"id": 2512788,
		"name": "Riacho de Santo Antônio",
		"stateCode": "PB"
	},
	{
		"id": 2512804,
		"name": "Riacho dos Cavalos",
		"stateCode": "PB"
	},
	{
		"id": 2512903,
		"name": "Rio Tinto",
		"stateCode": "PB"
	},
	{
		"id": 2513000,
		"name": "Salgadinho",
		"stateCode": "PB"
	},
	{
		"id": 2513109,
		"name": "Salgado de São Félix",
		"stateCode": "PB"
	},
	{
		"id": 2513158,
		"name": "Santa Cecília",
		"stateCode": "PB"
	},
	{
		"id": 2513208,
		"name": "Santa Cruz",
		"stateCode": "PB"
	},
	{
		"id": 2513307,
		"name": "Santa Helena",
		"stateCode": "PB"
	},
	{
		"id": 2513356,
		"name": "Santa Inês",
		"stateCode": "PB"
	},
	{
		"id": 2513406,
		"name": "Santa Luzia",
		"stateCode": "PB"
	},
	{
		"id": 2513703,
		"name": "Santa Rita",
		"stateCode": "PB"
	},
	{
		"id": 2513802,
		"name": "Santa Teresinha",
		"stateCode": "PB"
	},
	{
		"id": 2513505,
		"name": "Santana de Mangueira",
		"stateCode": "PB"
	},
	{
		"id": 2513604,
		"name": "Santana dos Garrotes",
		"stateCode": "PB"
	},
	{
		"id": 2513851,
		"name": "Santo André",
		"stateCode": "PB"
	},
	{
		"id": 2513927,
		"name": "São Bentinho",
		"stateCode": "PB"
	},
	{
		"id": 2513901,
		"name": "São Bento",
		"stateCode": "PB"
	},
	{
		"id": 2513968,
		"name": "São Domingos",
		"stateCode": "PB"
	},
	{
		"id": 2513943,
		"name": "São Domingos do Cariri",
		"stateCode": "PB"
	},
	{
		"id": 2513984,
		"name": "São Francisco",
		"stateCode": "PB"
	},
	{
		"id": 2514008,
		"name": "São João do Cariri",
		"stateCode": "PB"
	},
	{
		"id": 2500700,
		"name": "São João do Rio do Peixe",
		"stateCode": "PB"
	},
	{
		"id": 2514107,
		"name": "São João do Tigre",
		"stateCode": "PB"
	},
	{
		"id": 2514206,
		"name": "São José da Lagoa Tapada",
		"stateCode": "PB"
	},
	{
		"id": 2514305,
		"name": "São José de Caiana",
		"stateCode": "PB"
	},
	{
		"id": 2514404,
		"name": "São José de Espinharas",
		"stateCode": "PB"
	},
	{
		"id": 2514503,
		"name": "São José de Piranhas",
		"stateCode": "PB"
	},
	{
		"id": 2514552,
		"name": "São José de Princesa",
		"stateCode": "PB"
	},
	{
		"id": 2514602,
		"name": "São José do Bonfim",
		"stateCode": "PB"
	},
	{
		"id": 2514651,
		"name": "São José do Brejo do Cruz",
		"stateCode": "PB"
	},
	{
		"id": 2514701,
		"name": "São José do Sabugi",
		"stateCode": "PB"
	},
	{
		"id": 2514800,
		"name": "São José dos Cordeiros",
		"stateCode": "PB"
	},
	{
		"id": 2514453,
		"name": "São José dos Ramos",
		"stateCode": "PB"
	},
	{
		"id": 2514909,
		"name": "São Mamede",
		"stateCode": "PB"
	},
	{
		"id": 2515005,
		"name": "São Miguel de Taipu",
		"stateCode": "PB"
	},
	{
		"id": 2515104,
		"name": "São Sebastião de Lagoa de Roça",
		"stateCode": "PB"
	},
	{
		"id": 2515203,
		"name": "São Sebastião do Umbuzeiro",
		"stateCode": "PB"
	},
	{
		"id": 2515401,
		"name": "São Vicente do Seridó",
		"stateCode": "PB"
	},
	{
		"id": 2515302,
		"name": "Sapé",
		"stateCode": "PB"
	},
	{
		"id": 2515500,
		"name": "Serra Branca",
		"stateCode": "PB"
	},
	{
		"id": 2515609,
		"name": "Serra da Raiz",
		"stateCode": "PB"
	},
	{
		"id": 2515708,
		"name": "Serra Grande",
		"stateCode": "PB"
	},
	{
		"id": 2515807,
		"name": "Serra Redonda",
		"stateCode": "PB"
	},
	{
		"id": 2515906,
		"name": "Serraria",
		"stateCode": "PB"
	},
	{
		"id": 2515930,
		"name": "Sertãozinho",
		"stateCode": "PB"
	},
	{
		"id": 2515971,
		"name": "Sobrado",
		"stateCode": "PB"
	},
	{
		"id": 2516003,
		"name": "Solânea",
		"stateCode": "PB"
	},
	{
		"id": 2516102,
		"name": "Soledade",
		"stateCode": "PB"
	},
	{
		"id": 2516151,
		"name": "Sossêgo",
		"stateCode": "PB"
	},
	{
		"id": 2516201,
		"name": "Sousa",
		"stateCode": "PB"
	},
	{
		"id": 2516300,
		"name": "Sumé",
		"stateCode": "PB"
	},
	{
		"id": 2516409,
		"name": "Tacima",
		"stateCode": "PB"
	},
	{
		"id": 2516508,
		"name": "Taperoá",
		"stateCode": "PB"
	},
	{
		"id": 2516607,
		"name": "Tavares",
		"stateCode": "PB"
	},
	{
		"id": 2516706,
		"name": "Teixeira",
		"stateCode": "PB"
	},
	{
		"id": 2516755,
		"name": "Tenório",
		"stateCode": "PB"
	},
	{
		"id": 2516805,
		"name": "Triunfo",
		"stateCode": "PB"
	},
	{
		"id": 2516904,
		"name": "Uiraúna",
		"stateCode": "PB"
	},
	{
		"id": 2517001,
		"name": "Umbuzeiro",
		"stateCode": "PB"
	},
	{
		"id": 2517100,
		"name": "Várzea",
		"stateCode": "PB"
	},
	{
		"id": 2517209,
		"name": "Vieirópolis",
		"stateCode": "PB"
	},
	{
		"id": 2505501,
		"name": "Vista Serrana",
		"stateCode": "PB"
	},
	{
		"id": 2517407,
		"name": "Zabelê",
		"stateCode": "PB"
	},
	{
		"id": 2600054,
		"name": "Abreu e Lima",
		"stateCode": "PE"
	},
	{
		"id": 2600104,
		"name": "Afogados da Ingazeira",
		"stateCode": "PE"
	},
	{
		"id": 2600203,
		"name": "Afrânio",
		"stateCode": "PE"
	},
	{
		"id": 2600302,
		"name": "Agrestina",
		"stateCode": "PE"
	},
	{
		"id": 2600401,
		"name": "Água Preta",
		"stateCode": "PE"
	},
	{
		"id": 2600500,
		"name": "Águas Belas",
		"stateCode": "PE"
	},
	{
		"id": 2600609,
		"name": "Alagoinha",
		"stateCode": "PE"
	},
	{
		"id": 2600708,
		"name": "Aliança",
		"stateCode": "PE"
	},
	{
		"id": 2600807,
		"name": "Altinho",
		"stateCode": "PE"
	},
	{
		"id": 2600906,
		"name": "Amaraji",
		"stateCode": "PE"
	},
	{
		"id": 2601003,
		"name": "Angelim",
		"stateCode": "PE"
	},
	{
		"id": 2601052,
		"name": "Araçoiaba",
		"stateCode": "PE"
	},
	{
		"id": 2601102,
		"name": "Araripina",
		"stateCode": "PE"
	},
	{
		"id": 2601201,
		"name": "Arcoverde",
		"stateCode": "PE"
	},
	{
		"id": 2601300,
		"name": "Barra de Guabiraba",
		"stateCode": "PE"
	},
	{
		"id": 2601409,
		"name": "Barreiros",
		"stateCode": "PE"
	},
	{
		"id": 2601508,
		"name": "Belém de Maria",
		"stateCode": "PE"
	},
	{
		"id": 2601607,
		"name": "Belém do São Francisco",
		"stateCode": "PE"
	},
	{
		"id": 2601706,
		"name": "Belo Jardim",
		"stateCode": "PE"
	},
	{
		"id": 2601805,
		"name": "Betânia",
		"stateCode": "PE"
	},
	{
		"id": 2601904,
		"name": "Bezerros",
		"stateCode": "PE"
	},
	{
		"id": 2602001,
		"name": "Bodocó",
		"stateCode": "PE"
	},
	{
		"id": 2602100,
		"name": "Bom Conselho",
		"stateCode": "PE"
	},
	{
		"id": 2602209,
		"name": "Bom Jardim",
		"stateCode": "PE"
	},
	{
		"id": 2602308,
		"name": "Bonito",
		"stateCode": "PE"
	},
	{
		"id": 2602407,
		"name": "Brejão",
		"stateCode": "PE"
	},
	{
		"id": 2602506,
		"name": "Brejinho",
		"stateCode": "PE"
	},
	{
		"id": 2602605,
		"name": "Brejo da Madre de Deus",
		"stateCode": "PE"
	},
	{
		"id": 2602704,
		"name": "Buenos Aires",
		"stateCode": "PE"
	},
	{
		"id": 2602803,
		"name": "Buíque",
		"stateCode": "PE"
	},
	{
		"id": 2602902,
		"name": "Cabo de Santo Agostinho",
		"stateCode": "PE"
	},
	{
		"id": 2603009,
		"name": "Cabrobó",
		"stateCode": "PE"
	},
	{
		"id": 2603108,
		"name": "Cachoeirinha",
		"stateCode": "PE"
	},
	{
		"id": 2603207,
		"name": "Caetés",
		"stateCode": "PE"
	},
	{
		"id": 2603306,
		"name": "Calçado",
		"stateCode": "PE"
	},
	{
		"id": 2603405,
		"name": "Calumbi",
		"stateCode": "PE"
	},
	{
		"id": 2603454,
		"name": "Camaragibe",
		"stateCode": "PE"
	},
	{
		"id": 2603504,
		"name": "Camocim de São Félix",
		"stateCode": "PE"
	},
	{
		"id": 2603603,
		"name": "Camutanga",
		"stateCode": "PE"
	},
	{
		"id": 2603702,
		"name": "Canhotinho",
		"stateCode": "PE"
	},
	{
		"id": 2603801,
		"name": "Capoeiras",
		"stateCode": "PE"
	},
	{
		"id": 2603900,
		"name": "Carnaíba",
		"stateCode": "PE"
	},
	{
		"id": 2603926,
		"name": "Carnaubeira da Penha",
		"stateCode": "PE"
	},
	{
		"id": 2604007,
		"name": "Carpina",
		"stateCode": "PE"
	},
	{
		"id": 2604106,
		"name": "Caruaru",
		"stateCode": "PE"
	},
	{
		"id": 2604155,
		"name": "Casinhas",
		"stateCode": "PE"
	},
	{
		"id": 2604205,
		"name": "Catende",
		"stateCode": "PE"
	},
	{
		"id": 2604304,
		"name": "Cedro",
		"stateCode": "PE"
	},
	{
		"id": 2604403,
		"name": "Chã de Alegria",
		"stateCode": "PE"
	},
	{
		"id": 2604502,
		"name": "Chã Grande",
		"stateCode": "PE"
	},
	{
		"id": 2604601,
		"name": "Condado",
		"stateCode": "PE"
	},
	{
		"id": 2604700,
		"name": "Correntes",
		"stateCode": "PE"
	},
	{
		"id": 2604809,
		"name": "Cortês",
		"stateCode": "PE"
	},
	{
		"id": 2604908,
		"name": "Cumaru",
		"stateCode": "PE"
	},
	{
		"id": 2605004,
		"name": "Cupira",
		"stateCode": "PE"
	},
	{
		"id": 2605103,
		"name": "Custódia",
		"stateCode": "PE"
	},
	{
		"id": 2605152,
		"name": "Dormentes",
		"stateCode": "PE"
	},
	{
		"id": 2605202,
		"name": "Escada",
		"stateCode": "PE"
	},
	{
		"id": 2605301,
		"name": "Exu",
		"stateCode": "PE"
	},
	{
		"id": 2605400,
		"name": "Feira Nova",
		"stateCode": "PE"
	},
	{
		"id": 2605459,
		"name": "Fernando de Noronha",
		"stateCode": "PE"
	},
	{
		"id": 2605509,
		"name": "Ferreiros",
		"stateCode": "PE"
	},
	{
		"id": 2605608,
		"name": "Flores",
		"stateCode": "PE"
	},
	{
		"id": 2605707,
		"name": "Floresta",
		"stateCode": "PE"
	},
	{
		"id": 2605806,
		"name": "Frei Miguelinho",
		"stateCode": "PE"
	},
	{
		"id": 2605905,
		"name": "Gameleira",
		"stateCode": "PE"
	},
	{
		"id": 2606002,
		"name": "Garanhuns",
		"stateCode": "PE"
	},
	{
		"id": 2606101,
		"name": "Glória do Goitá",
		"stateCode": "PE"
	},
	{
		"id": 2606200,
		"name": "Goiana",
		"stateCode": "PE"
	},
	{
		"id": 2606309,
		"name": "Granito",
		"stateCode": "PE"
	},
	{
		"id": 2606408,
		"name": "Gravatá",
		"stateCode": "PE"
	},
	{
		"id": 2606507,
		"name": "Iati",
		"stateCode": "PE"
	},
	{
		"id": 2606606,
		"name": "Ibimirim",
		"stateCode": "PE"
	},
	{
		"id": 2606705,
		"name": "Ibirajuba",
		"stateCode": "PE"
	},
	{
		"id": 2606804,
		"name": "Igarassu",
		"stateCode": "PE"
	},
	{
		"id": 2606903,
		"name": "Iguaracy",
		"stateCode": "PE"
	},
	{
		"id": 2607604,
		"name": "Ilha de Itamaracá",
		"stateCode": "PE"
	},
	{
		"id": 2607000,
		"name": "Inajá",
		"stateCode": "PE"
	},
	{
		"id": 2607109,
		"name": "Ingazeira",
		"stateCode": "PE"
	},
	{
		"id": 2607208,
		"name": "Ipojuca",
		"stateCode": "PE"
	},
	{
		"id": 2607307,
		"name": "Ipubi",
		"stateCode": "PE"
	},
	{
		"id": 2607406,
		"name": "Itacuruba",
		"stateCode": "PE"
	},
	{
		"id": 2607505,
		"name": "Itaíba",
		"stateCode": "PE"
	},
	{
		"id": 2607653,
		"name": "Itambé",
		"stateCode": "PE"
	},
	{
		"id": 2607703,
		"name": "Itapetim",
		"stateCode": "PE"
	},
	{
		"id": 2607752,
		"name": "Itapissuma",
		"stateCode": "PE"
	},
	{
		"id": 2607802,
		"name": "Itaquitinga",
		"stateCode": "PE"
	},
	{
		"id": 2607901,
		"name": "Jaboatão dos Guararapes",
		"stateCode": "PE"
	},
	{
		"id": 2607950,
		"name": "Jaqueira",
		"stateCode": "PE"
	},
	{
		"id": 2608008,
		"name": "Jataúba",
		"stateCode": "PE"
	},
	{
		"id": 2608057,
		"name": "Jatobá",
		"stateCode": "PE"
	},
	{
		"id": 2608107,
		"name": "João Alfredo",
		"stateCode": "PE"
	},
	{
		"id": 2608206,
		"name": "Joaquim Nabuco",
		"stateCode": "PE"
	},
	{
		"id": 2608255,
		"name": "Jucati",
		"stateCode": "PE"
	},
	{
		"id": 2608305,
		"name": "Jupi",
		"stateCode": "PE"
	},
	{
		"id": 2608404,
		"name": "Jurema",
		"stateCode": "PE"
	},
	{
		"id": 2608503,
		"name": "Lagoa de Itaenga",
		"stateCode": "PE"
	},
	{
		"id": 2608453,
		"name": "Lagoa do Carro",
		"stateCode": "PE"
	},
	{
		"id": 2608602,
		"name": "Lagoa do Ouro",
		"stateCode": "PE"
	},
	{
		"id": 2608701,
		"name": "Lagoa dos Gatos",
		"stateCode": "PE"
	},
	{
		"id": 2608750,
		"name": "Lagoa Grande",
		"stateCode": "PE"
	},
	{
		"id": 2608800,
		"name": "Lajedo",
		"stateCode": "PE"
	},
	{
		"id": 2608909,
		"name": "Limoeiro",
		"stateCode": "PE"
	},
	{
		"id": 2609006,
		"name": "Macaparana",
		"stateCode": "PE"
	},
	{
		"id": 2609105,
		"name": "Machados",
		"stateCode": "PE"
	},
	{
		"id": 2609154,
		"name": "Manari",
		"stateCode": "PE"
	},
	{
		"id": 2609204,
		"name": "Maraial",
		"stateCode": "PE"
	},
	{
		"id": 2609303,
		"name": "Mirandiba",
		"stateCode": "PE"
	},
	{
		"id": 2614303,
		"name": "Moreilândia",
		"stateCode": "PE"
	},
	{
		"id": 2609402,
		"name": "Moreno",
		"stateCode": "PE"
	},
	{
		"id": 2609501,
		"name": "Nazaré da Mata",
		"stateCode": "PE"
	},
	{
		"id": 2609600,
		"name": "Olinda",
		"stateCode": "PE"
	},
	{
		"id": 2609709,
		"name": "Orobó",
		"stateCode": "PE"
	},
	{
		"id": 2609808,
		"name": "Orocó",
		"stateCode": "PE"
	},
	{
		"id": 2609907,
		"name": "Ouricuri",
		"stateCode": "PE"
	},
	{
		"id": 2610004,
		"name": "Palmares",
		"stateCode": "PE"
	},
	{
		"id": 2610103,
		"name": "Palmeirina",
		"stateCode": "PE"
	},
	{
		"id": 2610202,
		"name": "Panelas",
		"stateCode": "PE"
	},
	{
		"id": 2610301,
		"name": "Paranatama",
		"stateCode": "PE"
	},
	{
		"id": 2610400,
		"name": "Parnamirim",
		"stateCode": "PE"
	},
	{
		"id": 2610509,
		"name": "Passira",
		"stateCode": "PE"
	},
	{
		"id": 2610608,
		"name": "Paudalho",
		"stateCode": "PE"
	},
	{
		"id": 2610707,
		"name": "Paulista",
		"stateCode": "PE"
	},
	{
		"id": 2610806,
		"name": "Pedra",
		"stateCode": "PE"
	},
	{
		"id": 2610905,
		"name": "Pesqueira",
		"stateCode": "PE"
	},
	{
		"id": 2611002,
		"name": "Petrolândia",
		"stateCode": "PE"
	},
	{
		"id": 2611101,
		"name": "Petrolina",
		"stateCode": "PE"
	},
	{
		"id": 2611200,
		"name": "Poção",
		"stateCode": "PE"
	},
	{
		"id": 2611309,
		"name": "Pombos",
		"stateCode": "PE"
	},
	{
		"id": 2611408,
		"name": "Primavera",
		"stateCode": "PE"
	},
	{
		"id": 2611507,
		"name": "Quipapá",
		"stateCode": "PE"
	},
	{
		"id": 2611533,
		"name": "Quixaba",
		"stateCode": "PE"
	},
	{
		"id": 2611606,
		"name": "Recife",
		"stateCode": "PE"
	},
	{
		"id": 2611705,
		"name": "Riacho das Almas",
		"stateCode": "PE"
	},
	{
		"id": 2611804,
		"name": "Ribeirão",
		"stateCode": "PE"
	},
	{
		"id": 2611903,
		"name": "Rio Formoso",
		"stateCode": "PE"
	},
	{
		"id": 2612000,
		"name": "Sairé",
		"stateCode": "PE"
	},
	{
		"id": 2612109,
		"name": "Salgadinho",
		"stateCode": "PE"
	},
	{
		"id": 2612208,
		"name": "Salgueiro",
		"stateCode": "PE"
	},
	{
		"id": 2612307,
		"name": "Saloá",
		"stateCode": "PE"
	},
	{
		"id": 2612406,
		"name": "Sanharó",
		"stateCode": "PE"
	},
	{
		"id": 2612455,
		"name": "Santa Cruz",
		"stateCode": "PE"
	},
	{
		"id": 2612471,
		"name": "Santa Cruz da Baixa Verde",
		"stateCode": "PE"
	},
	{
		"id": 2612505,
		"name": "Santa Cruz do Capibaribe",
		"stateCode": "PE"
	},
	{
		"id": 2612554,
		"name": "Santa Filomena",
		"stateCode": "PE"
	},
	{
		"id": 2612604,
		"name": "Santa Maria da Boa Vista",
		"stateCode": "PE"
	},
	{
		"id": 2612703,
		"name": "Santa Maria do Cambucá",
		"stateCode": "PE"
	},
	{
		"id": 2612802,
		"name": "Santa Terezinha",
		"stateCode": "PE"
	},
	{
		"id": 2612901,
		"name": "São Benedito do Sul",
		"stateCode": "PE"
	},
	{
		"id": 2613008,
		"name": "São Bento do Una",
		"stateCode": "PE"
	},
	{
		"id": 2613107,
		"name": "São Caitano",
		"stateCode": "PE"
	},
	{
		"id": 2613206,
		"name": "São João",
		"stateCode": "PE"
	},
	{
		"id": 2613305,
		"name": "São Joaquim do Monte",
		"stateCode": "PE"
	},
	{
		"id": 2613404,
		"name": "São José da Coroa Grande",
		"stateCode": "PE"
	},
	{
		"id": 2613503,
		"name": "São José do Belmonte",
		"stateCode": "PE"
	},
	{
		"id": 2613602,
		"name": "São José do Egito",
		"stateCode": "PE"
	},
	{
		"id": 2613701,
		"name": "São Lourenço da Mata",
		"stateCode": "PE"
	},
	{
		"id": 2613800,
		"name": "São Vicente Férrer",
		"stateCode": "PE"
	},
	{
		"id": 2613909,
		"name": "Serra Talhada",
		"stateCode": "PE"
	},
	{
		"id": 2614006,
		"name": "Serrita",
		"stateCode": "PE"
	},
	{
		"id": 2614105,
		"name": "Sertânia",
		"stateCode": "PE"
	},
	{
		"id": 2614204,
		"name": "Sirinhaém",
		"stateCode": "PE"
	},
	{
		"id": 2614402,
		"name": "Solidão",
		"stateCode": "PE"
	},
	{
		"id": 2614501,
		"name": "Surubim",
		"stateCode": "PE"
	},
	{
		"id": 2614600,
		"name": "Tabira",
		"stateCode": "PE"
	},
	{
		"id": 2614709,
		"name": "Tacaimbó",
		"stateCode": "PE"
	},
	{
		"id": 2614808,
		"name": "Tacaratu",
		"stateCode": "PE"
	},
	{
		"id": 2614857,
		"name": "Tamandaré",
		"stateCode": "PE"
	},
	{
		"id": 2615003,
		"name": "Taquaritinga do Norte",
		"stateCode": "PE"
	},
	{
		"id": 2615102,
		"name": "Terezinha",
		"stateCode": "PE"
	},
	{
		"id": 2615201,
		"name": "Terra Nova",
		"stateCode": "PE"
	},
	{
		"id": 2615300,
		"name": "Timbaúba",
		"stateCode": "PE"
	},
	{
		"id": 2615409,
		"name": "Toritama",
		"stateCode": "PE"
	},
	{
		"id": 2615508,
		"name": "Tracunhaém",
		"stateCode": "PE"
	},
	{
		"id": 2615607,
		"name": "Trindade",
		"stateCode": "PE"
	},
	{
		"id": 2615706,
		"name": "Triunfo",
		"stateCode": "PE"
	},
	{
		"id": 2615805,
		"name": "Tupanatinga",
		"stateCode": "PE"
	},
	{
		"id": 2615904,
		"name": "Tuparetama",
		"stateCode": "PE"
	},
	{
		"id": 2616001,
		"name": "Venturosa",
		"stateCode": "PE"
	},
	{
		"id": 2616100,
		"name": "Verdejante",
		"stateCode": "PE"
	},
	{
		"id": 2616183,
		"name": "Vertente do Lério",
		"stateCode": "PE"
	},
	{
		"id": 2616209,
		"name": "Vertentes",
		"stateCode": "PE"
	},
	{
		"id": 2616308,
		"name": "Vicência",
		"stateCode": "PE"
	},
	{
		"id": 2616407,
		"name": "Vitória de Santo Antão",
		"stateCode": "PE"
	},
	{
		"id": 2616506,
		"name": "Xexéu",
		"stateCode": "PE"
	},
	{
		"id": 2200053,
		"name": "Acauã",
		"stateCode": "PI"
	},
	{
		"id": 2200103,
		"name": "Agricolândia",
		"stateCode": "PI"
	},
	{
		"id": 2200202,
		"name": "Água Branca",
		"stateCode": "PI"
	},
	{
		"id": 2200251,
		"name": "Alagoinha do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2200277,
		"name": "Alegrete do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2200301,
		"name": "Alto Longá",
		"stateCode": "PI"
	},
	{
		"id": 2200400,
		"name": "Altos",
		"stateCode": "PI"
	},
	{
		"id": 2200459,
		"name": "Alvorada do Gurguéia",
		"stateCode": "PI"
	},
	{
		"id": 2200509,
		"name": "Amarante",
		"stateCode": "PI"
	},
	{
		"id": 2200608,
		"name": "Angical do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2200707,
		"name": "Anísio de Abreu",
		"stateCode": "PI"
	},
	{
		"id": 2200806,
		"name": "Antônio Almeida",
		"stateCode": "PI"
	},
	{
		"id": 2200905,
		"name": "Aroazes",
		"stateCode": "PI"
	},
	{
		"id": 2200954,
		"name": "Aroeiras do Itaim",
		"stateCode": "PI"
	},
	{
		"id": 2201002,
		"name": "Arraial",
		"stateCode": "PI"
	},
	{
		"id": 2201051,
		"name": "Assunção do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2201101,
		"name": "Avelino Lopes",
		"stateCode": "PI"
	},
	{
		"id": 2201150,
		"name": "Baixa Grande do Ribeiro",
		"stateCode": "PI"
	},
	{
		"id": 2201176,
		"name": "Barra D'Alcântara",
		"stateCode": "PI"
	},
	{
		"id": 2201200,
		"name": "Barras",
		"stateCode": "PI"
	},
	{
		"id": 2201309,
		"name": "Barreiras do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2201408,
		"name": "Barro Duro",
		"stateCode": "PI"
	},
	{
		"id": 2201507,
		"name": "Batalha",
		"stateCode": "PI"
	},
	{
		"id": 2201556,
		"name": "Bela Vista do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2201572,
		"name": "Belém do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2201606,
		"name": "Beneditinos",
		"stateCode": "PI"
	},
	{
		"id": 2201705,
		"name": "Bertolínia",
		"stateCode": "PI"
	},
	{
		"id": 2201739,
		"name": "Betânia do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2201770,
		"name": "Boa Hora",
		"stateCode": "PI"
	},
	{
		"id": 2201804,
		"name": "Bocaina",
		"stateCode": "PI"
	},
	{
		"id": 2201903,
		"name": "Bom Jesus",
		"stateCode": "PI"
	},
	{
		"id": 2201919,
		"name": "Bom Princípio do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2201929,
		"name": "Bonfim do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2201945,
		"name": "Boqueirão do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2201960,
		"name": "Brasileira",
		"stateCode": "PI"
	},
	{
		"id": 2201988,
		"name": "Brejo do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2202000,
		"name": "Buriti dos Lopes",
		"stateCode": "PI"
	},
	{
		"id": 2202026,
		"name": "Buriti dos Montes",
		"stateCode": "PI"
	},
	{
		"id": 2202059,
		"name": "Cabeceiras do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2202075,
		"name": "Cajazeiras do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2202083,
		"name": "Cajueiro da Praia",
		"stateCode": "PI"
	},
	{
		"id": 2202091,
		"name": "Caldeirão Grande do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2202109,
		"name": "Campinas do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2202117,
		"name": "Campo Alegre do Fidalgo",
		"stateCode": "PI"
	},
	{
		"id": 2202133,
		"name": "Campo Grande do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2202174,
		"name": "Campo Largo do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2202208,
		"name": "Campo Maior",
		"stateCode": "PI"
	},
	{
		"id": 2202251,
		"name": "Canavieira",
		"stateCode": "PI"
	},
	{
		"id": 2202307,
		"name": "Canto do Buriti",
		"stateCode": "PI"
	},
	{
		"id": 2202406,
		"name": "Capitão de Campos",
		"stateCode": "PI"
	},
	{
		"id": 2202455,
		"name": "Capitão Gervásio Oliveira",
		"stateCode": "PI"
	},
	{
		"id": 2202505,
		"name": "Caracol",
		"stateCode": "PI"
	},
	{
		"id": 2202539,
		"name": "Caraúbas do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2202554,
		"name": "Caridade do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2202604,
		"name": "Castelo do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2202653,
		"name": "Caxingó",
		"stateCode": "PI"
	},
	{
		"id": 2202703,
		"name": "Cocal",
		"stateCode": "PI"
	},
	{
		"id": 2202711,
		"name": "Cocal de Telha",
		"stateCode": "PI"
	},
	{
		"id": 2202729,
		"name": "Cocal dos Alves",
		"stateCode": "PI"
	},
	{
		"id": 2202737,
		"name": "Coivaras",
		"stateCode": "PI"
	},
	{
		"id": 2202752,
		"name": "Colônia do Gurguéia",
		"stateCode": "PI"
	},
	{
		"id": 2202778,
		"name": "Colônia do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2202802,
		"name": "Conceição do Canindé",
		"stateCode": "PI"
	},
	{
		"id": 2202851,
		"name": "Coronel José Dias",
		"stateCode": "PI"
	},
	{
		"id": 2202901,
		"name": "Corrente",
		"stateCode": "PI"
	},
	{
		"id": 2203008,
		"name": "Cristalândia do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2203107,
		"name": "Cristino Castro",
		"stateCode": "PI"
	},
	{
		"id": 2203206,
		"name": "Curimatá",
		"stateCode": "PI"
	},
	{
		"id": 2203230,
		"name": "Currais",
		"stateCode": "PI"
	},
	{
		"id": 2203271,
		"name": "Curral Novo do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2203255,
		"name": "Curralinhos",
		"stateCode": "PI"
	},
	{
		"id": 2203305,
		"name": "Demerval Lobão",
		"stateCode": "PI"
	},
	{
		"id": 2203354,
		"name": "Dirceu Arcoverde",
		"stateCode": "PI"
	},
	{
		"id": 2203404,
		"name": "Dom Expedito Lopes",
		"stateCode": "PI"
	},
	{
		"id": 2203453,
		"name": "Dom Inocêncio",
		"stateCode": "PI"
	},
	{
		"id": 2203420,
		"name": "Domingos Mourão",
		"stateCode": "PI"
	},
	{
		"id": 2203503,
		"name": "Elesbão Veloso",
		"stateCode": "PI"
	},
	{
		"id": 2203602,
		"name": "Eliseu Martins",
		"stateCode": "PI"
	},
	{
		"id": 2203701,
		"name": "Esperantina",
		"stateCode": "PI"
	},
	{
		"id": 2203750,
		"name": "Fartura do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2203800,
		"name": "Flores do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2203859,
		"name": "Floresta do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2203909,
		"name": "Floriano",
		"stateCode": "PI"
	},
	{
		"id": 2204006,
		"name": "Francinópolis",
		"stateCode": "PI"
	},
	{
		"id": 2204105,
		"name": "Francisco Ayres",
		"stateCode": "PI"
	},
	{
		"id": 2204154,
		"name": "Francisco Macedo",
		"stateCode": "PI"
	},
	{
		"id": 2204204,
		"name": "Francisco Santos",
		"stateCode": "PI"
	},
	{
		"id": 2204303,
		"name": "Fronteiras",
		"stateCode": "PI"
	},
	{
		"id": 2204352,
		"name": "Geminiano",
		"stateCode": "PI"
	},
	{
		"id": 2204402,
		"name": "Gilbués",
		"stateCode": "PI"
	},
	{
		"id": 2204501,
		"name": "Guadalupe",
		"stateCode": "PI"
	},
	{
		"id": 2204550,
		"name": "Guaribas",
		"stateCode": "PI"
	},
	{
		"id": 2204600,
		"name": "Hugo Napoleão",
		"stateCode": "PI"
	},
	{
		"id": 2204659,
		"name": "Ilha Grande",
		"stateCode": "PI"
	},
	{
		"id": 2204709,
		"name": "Inhuma",
		"stateCode": "PI"
	},
	{
		"id": 2204808,
		"name": "Ipiranga do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2204907,
		"name": "Isaías Coelho",
		"stateCode": "PI"
	},
	{
		"id": 2205003,
		"name": "Itainópolis",
		"stateCode": "PI"
	},
	{
		"id": 2205102,
		"name": "Itaueira",
		"stateCode": "PI"
	},
	{
		"id": 2205151,
		"name": "Jacobina do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2205201,
		"name": "Jaicós",
		"stateCode": "PI"
	},
	{
		"id": 2205250,
		"name": "Jardim do Mulato",
		"stateCode": "PI"
	},
	{
		"id": 2205276,
		"name": "Jatobá do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2205300,
		"name": "Jerumenha",
		"stateCode": "PI"
	},
	{
		"id": 2205359,
		"name": "João Costa",
		"stateCode": "PI"
	},
	{
		"id": 2205409,
		"name": "Joaquim Pires",
		"stateCode": "PI"
	},
	{
		"id": 2205458,
		"name": "Joca Marques",
		"stateCode": "PI"
	},
	{
		"id": 2205508,
		"name": "José de Freitas",
		"stateCode": "PI"
	},
	{
		"id": 2205516,
		"name": "Juazeiro do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2205524,
		"name": "Júlio Borges",
		"stateCode": "PI"
	},
	{
		"id": 2205532,
		"name": "Jurema",
		"stateCode": "PI"
	},
	{
		"id": 2205557,
		"name": "Lagoa Alegre",
		"stateCode": "PI"
	},
	{
		"id": 2205573,
		"name": "Lagoa de São Francisco",
		"stateCode": "PI"
	},
	{
		"id": 2205565,
		"name": "Lagoa do Barro do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2205581,
		"name": "Lagoa do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2205599,
		"name": "Lagoa do Sítio",
		"stateCode": "PI"
	},
	{
		"id": 2205540,
		"name": "Lagoinha do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2205607,
		"name": "Landri Sales",
		"stateCode": "PI"
	},
	{
		"id": 2205706,
		"name": "Luís Correia",
		"stateCode": "PI"
	},
	{
		"id": 2205805,
		"name": "Luzilândia",
		"stateCode": "PI"
	},
	{
		"id": 2205854,
		"name": "Madeiro",
		"stateCode": "PI"
	},
	{
		"id": 2205904,
		"name": "Manoel Emídio",
		"stateCode": "PI"
	},
	{
		"id": 2205953,
		"name": "Marcolândia",
		"stateCode": "PI"
	},
	{
		"id": 2206001,
		"name": "Marcos Parente",
		"stateCode": "PI"
	},
	{
		"id": 2206050,
		"name": "Massapê do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2206100,
		"name": "Matias Olímpio",
		"stateCode": "PI"
	},
	{
		"id": 2206209,
		"name": "Miguel Alves",
		"stateCode": "PI"
	},
	{
		"id": 2206308,
		"name": "Miguel Leão",
		"stateCode": "PI"
	},
	{
		"id": 2206357,
		"name": "Milton Brandão",
		"stateCode": "PI"
	},
	{
		"id": 2206407,
		"name": "Monsenhor Gil",
		"stateCode": "PI"
	},
	{
		"id": 2206506,
		"name": "Monsenhor Hipólito",
		"stateCode": "PI"
	},
	{
		"id": 2206605,
		"name": "Monte Alegre do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2206654,
		"name": "Morro Cabeça no Tempo",
		"stateCode": "PI"
	},
	{
		"id": 2206670,
		"name": "Morro do Chapéu do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2206696,
		"name": "Murici dos Portelas",
		"stateCode": "PI"
	},
	{
		"id": 2206704,
		"name": "Nazaré do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2206720,
		"name": "Nazária",
		"stateCode": "PI"
	},
	{
		"id": 2206753,
		"name": "Nossa Senhora de Nazaré",
		"stateCode": "PI"
	},
	{
		"id": 2206803,
		"name": "Nossa Senhora dos Remédios",
		"stateCode": "PI"
	},
	{
		"id": 2207959,
		"name": "Nova Santa Rita",
		"stateCode": "PI"
	},
	{
		"id": 2206902,
		"name": "Novo Oriente do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2206951,
		"name": "Novo Santo Antônio",
		"stateCode": "PI"
	},
	{
		"id": 2207009,
		"name": "Oeiras",
		"stateCode": "PI"
	},
	{
		"id": 2207108,
		"name": "Olho D'Água do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2207207,
		"name": "Padre Marcos",
		"stateCode": "PI"
	},
	{
		"id": 2207306,
		"name": "Paes Landim",
		"stateCode": "PI"
	},
	{
		"id": 2207355,
		"name": "Pajeú do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2207405,
		"name": "Palmeira do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2207504,
		"name": "Palmeirais",
		"stateCode": "PI"
	},
	{
		"id": 2207553,
		"name": "Paquetá",
		"stateCode": "PI"
	},
	{
		"id": 2207603,
		"name": "Parnaguá",
		"stateCode": "PI"
	},
	{
		"id": 2207702,
		"name": "Parnaíba",
		"stateCode": "PI"
	},
	{
		"id": 2207751,
		"name": "Passagem Franca do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2207777,
		"name": "Patos do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2207793,
		"name": "Pau D'Arco do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2207801,
		"name": "Paulistana",
		"stateCode": "PI"
	},
	{
		"id": 2207850,
		"name": "Pavussu",
		"stateCode": "PI"
	},
	{
		"id": 2207900,
		"name": "Pedro II",
		"stateCode": "PI"
	},
	{
		"id": 2207934,
		"name": "Pedro Laurentino",
		"stateCode": "PI"
	},
	{
		"id": 2208007,
		"name": "Picos",
		"stateCode": "PI"
	},
	{
		"id": 2208106,
		"name": "Pimenteiras",
		"stateCode": "PI"
	},
	{
		"id": 2208205,
		"name": "Pio IX",
		"stateCode": "PI"
	},
	{
		"id": 2208304,
		"name": "Piracuruca",
		"stateCode": "PI"
	},
	{
		"id": 2208403,
		"name": "Piripiri",
		"stateCode": "PI"
	},
	{
		"id": 2208502,
		"name": "Porto",
		"stateCode": "PI"
	},
	{
		"id": 2208551,
		"name": "Porto Alegre do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2208601,
		"name": "Prata do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2208650,
		"name": "Queimada Nova",
		"stateCode": "PI"
	},
	{
		"id": 2208700,
		"name": "Redenção do Gurguéia",
		"stateCode": "PI"
	},
	{
		"id": 2208809,
		"name": "Regeneração",
		"stateCode": "PI"
	},
	{
		"id": 2208858,
		"name": "Riacho Frio",
		"stateCode": "PI"
	},
	{
		"id": 2208874,
		"name": "Ribeira do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2208908,
		"name": "Ribeiro Gonçalves",
		"stateCode": "PI"
	},
	{
		"id": 2209005,
		"name": "Rio Grande do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2209104,
		"name": "Santa Cruz do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2209153,
		"name": "Santa Cruz dos Milagres",
		"stateCode": "PI"
	},
	{
		"id": 2209203,
		"name": "Santa Filomena",
		"stateCode": "PI"
	},
	{
		"id": 2209302,
		"name": "Santa Luz",
		"stateCode": "PI"
	},
	{
		"id": 2209377,
		"name": "Santa Rosa do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2209351,
		"name": "Santana do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2209401,
		"name": "Santo Antônio de Lisboa",
		"stateCode": "PI"
	},
	{
		"id": 2209450,
		"name": "Santo Antônio dos Milagres",
		"stateCode": "PI"
	},
	{
		"id": 2209500,
		"name": "Santo Inácio do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2209559,
		"name": "São Braz do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2209609,
		"name": "São Félix do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2209658,
		"name": "São Francisco de Assis do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2209708,
		"name": "São Francisco do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2209757,
		"name": "São Gonçalo do Gurguéia",
		"stateCode": "PI"
	},
	{
		"id": 2209807,
		"name": "São Gonçalo do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2209856,
		"name": "São João da Canabrava",
		"stateCode": "PI"
	},
	{
		"id": 2209872,
		"name": "São João da Fronteira",
		"stateCode": "PI"
	},
	{
		"id": 2209906,
		"name": "São João da Serra",
		"stateCode": "PI"
	},
	{
		"id": 2209955,
		"name": "São João da Varjota",
		"stateCode": "PI"
	},
	{
		"id": 2209971,
		"name": "São João do Arraial",
		"stateCode": "PI"
	},
	{
		"id": 2210003,
		"name": "São João do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2210052,
		"name": "São José do Divino",
		"stateCode": "PI"
	},
	{
		"id": 2210102,
		"name": "São José do Peixe",
		"stateCode": "PI"
	},
	{
		"id": 2210201,
		"name": "São José do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2210300,
		"name": "São Julião",
		"stateCode": "PI"
	},
	{
		"id": 2210359,
		"name": "São Lourenço do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2210375,
		"name": "São Luis do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2210383,
		"name": "São Miguel da Baixa Grande",
		"stateCode": "PI"
	},
	{
		"id": 2210391,
		"name": "São Miguel do Fidalgo",
		"stateCode": "PI"
	},
	{
		"id": 2210409,
		"name": "São Miguel do Tapuio",
		"stateCode": "PI"
	},
	{
		"id": 2210508,
		"name": "São Pedro do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2210607,
		"name": "São Raimundo Nonato",
		"stateCode": "PI"
	},
	{
		"id": 2210623,
		"name": "Sebastião Barros",
		"stateCode": "PI"
	},
	{
		"id": 2210631,
		"name": "Sebastião Leal",
		"stateCode": "PI"
	},
	{
		"id": 2210656,
		"name": "Sigefredo Pacheco",
		"stateCode": "PI"
	},
	{
		"id": 2210706,
		"name": "Simões",
		"stateCode": "PI"
	},
	{
		"id": 2210805,
		"name": "Simplício Mendes",
		"stateCode": "PI"
	},
	{
		"id": 2210904,
		"name": "Socorro do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2210938,
		"name": "Sussuapara",
		"stateCode": "PI"
	},
	{
		"id": 2210953,
		"name": "Tamboril do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2210979,
		"name": "Tanque do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2211001,
		"name": "Teresina",
		"stateCode": "PI"
	},
	{
		"id": 2211100,
		"name": "União",
		"stateCode": "PI"
	},
	{
		"id": 2211209,
		"name": "Uruçuí",
		"stateCode": "PI"
	},
	{
		"id": 2211308,
		"name": "Valença do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2211357,
		"name": "Várzea Branca",
		"stateCode": "PI"
	},
	{
		"id": 2211407,
		"name": "Várzea Grande",
		"stateCode": "PI"
	},
	{
		"id": 2211506,
		"name": "Vera Mendes",
		"stateCode": "PI"
	},
	{
		"id": 2211605,
		"name": "Vila Nova do Piauí",
		"stateCode": "PI"
	},
	{
		"id": 2211704,
		"name": "Wall Ferraz",
		"stateCode": "PI"
	},
	{
		"id": 4100103,
		"name": "Abatiá",
		"stateCode": "PR"
	},
	{
		"id": 4100202,
		"name": "Adrianópolis",
		"stateCode": "PR"
	},
	{
		"id": 4100301,
		"name": "Agudos do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4100400,
		"name": "Almirante Tamandaré",
		"stateCode": "PR"
	},
	{
		"id": 4100459,
		"name": "Altamira do Paraná",
		"stateCode": "PR"
	},
	{
		"id": 4128625,
		"name": "Alto Paraíso",
		"stateCode": "PR"
	},
	{
		"id": 4100608,
		"name": "Alto Paraná",
		"stateCode": "PR"
	},
	{
		"id": 4100707,
		"name": "Alto Piquiri",
		"stateCode": "PR"
	},
	{
		"id": 4100509,
		"name": "Altônia",
		"stateCode": "PR"
	},
	{
		"id": 4100806,
		"name": "Alvorada do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4100905,
		"name": "Amaporã",
		"stateCode": "PR"
	},
	{
		"id": 4101002,
		"name": "Ampére",
		"stateCode": "PR"
	},
	{
		"id": 4101051,
		"name": "Anahy",
		"stateCode": "PR"
	},
	{
		"id": 4101101,
		"name": "Andirá",
		"stateCode": "PR"
	},
	{
		"id": 4101150,
		"name": "Ângulo",
		"stateCode": "PR"
	},
	{
		"id": 4101200,
		"name": "Antonina",
		"stateCode": "PR"
	},
	{
		"id": 4101309,
		"name": "Antônio Olinto",
		"stateCode": "PR"
	},
	{
		"id": 4101408,
		"name": "Apucarana",
		"stateCode": "PR"
	},
	{
		"id": 4101507,
		"name": "Arapongas",
		"stateCode": "PR"
	},
	{
		"id": 4101606,
		"name": "Arapoti",
		"stateCode": "PR"
	},
	{
		"id": 4101655,
		"name": "Arapuã",
		"stateCode": "PR"
	},
	{
		"id": 4101705,
		"name": "Araruna",
		"stateCode": "PR"
	},
	{
		"id": 4101804,
		"name": "Araucária",
		"stateCode": "PR"
	},
	{
		"id": 4101853,
		"name": "Ariranha do Ivaí",
		"stateCode": "PR"
	},
	{
		"id": 4101903,
		"name": "Assaí",
		"stateCode": "PR"
	},
	{
		"id": 4102000,
		"name": "Assis Chateaubriand",
		"stateCode": "PR"
	},
	{
		"id": 4102109,
		"name": "Astorga",
		"stateCode": "PR"
	},
	{
		"id": 4102208,
		"name": "Atalaia",
		"stateCode": "PR"
	},
	{
		"id": 4102307,
		"name": "Balsa Nova",
		"stateCode": "PR"
	},
	{
		"id": 4102406,
		"name": "Bandeirantes",
		"stateCode": "PR"
	},
	{
		"id": 4102505,
		"name": "Barbosa Ferraz",
		"stateCode": "PR"
	},
	{
		"id": 4102703,
		"name": "Barra do Jacaré",
		"stateCode": "PR"
	},
	{
		"id": 4102604,
		"name": "Barracão",
		"stateCode": "PR"
	},
	{
		"id": 4102752,
		"name": "Bela Vista da Caroba",
		"stateCode": "PR"
	},
	{
		"id": 4102802,
		"name": "Bela Vista do Paraíso",
		"stateCode": "PR"
	},
	{
		"id": 4102901,
		"name": "Bituruna",
		"stateCode": "PR"
	},
	{
		"id": 4103008,
		"name": "Boa Esperança",
		"stateCode": "PR"
	},
	{
		"id": 4103024,
		"name": "Boa Esperança do Iguaçu",
		"stateCode": "PR"
	},
	{
		"id": 4103040,
		"name": "Boa Ventura de São Roque",
		"stateCode": "PR"
	},
	{
		"id": 4103057,
		"name": "Boa Vista da Aparecida",
		"stateCode": "PR"
	},
	{
		"id": 4103107,
		"name": "Bocaiúva do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4103156,
		"name": "Bom Jesus do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4103206,
		"name": "Bom Sucesso",
		"stateCode": "PR"
	},
	{
		"id": 4103222,
		"name": "Bom Sucesso do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4103305,
		"name": "Borrazópolis",
		"stateCode": "PR"
	},
	{
		"id": 4103354,
		"name": "Braganey",
		"stateCode": "PR"
	},
	{
		"id": 4103370,
		"name": "Brasilândia do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4103404,
		"name": "Cafeara",
		"stateCode": "PR"
	},
	{
		"id": 4103453,
		"name": "Cafelândia",
		"stateCode": "PR"
	},
	{
		"id": 4103479,
		"name": "Cafezal do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4103503,
		"name": "Califórnia",
		"stateCode": "PR"
	},
	{
		"id": 4103602,
		"name": "Cambará",
		"stateCode": "PR"
	},
	{
		"id": 4103701,
		"name": "Cambé",
		"stateCode": "PR"
	},
	{
		"id": 4103800,
		"name": "Cambira",
		"stateCode": "PR"
	},
	{
		"id": 4103909,
		"name": "Campina da Lagoa",
		"stateCode": "PR"
	},
	{
		"id": 4103958,
		"name": "Campina do Simão",
		"stateCode": "PR"
	},
	{
		"id": 4104006,
		"name": "Campina Grande do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4104055,
		"name": "Campo Bonito",
		"stateCode": "PR"
	},
	{
		"id": 4104105,
		"name": "Campo do Tenente",
		"stateCode": "PR"
	},
	{
		"id": 4104204,
		"name": "Campo Largo",
		"stateCode": "PR"
	},
	{
		"id": 4104253,
		"name": "Campo Magro",
		"stateCode": "PR"
	},
	{
		"id": 4104303,
		"name": "Campo Mourão",
		"stateCode": "PR"
	},
	{
		"id": 4104402,
		"name": "Cândido de Abreu",
		"stateCode": "PR"
	},
	{
		"id": 4104428,
		"name": "Candói",
		"stateCode": "PR"
	},
	{
		"id": 4104451,
		"name": "Cantagalo",
		"stateCode": "PR"
	},
	{
		"id": 4104501,
		"name": "Capanema",
		"stateCode": "PR"
	},
	{
		"id": 4104600,
		"name": "Capitão Leônidas Marques",
		"stateCode": "PR"
	},
	{
		"id": 4104659,
		"name": "Carambeí",
		"stateCode": "PR"
	},
	{
		"id": 4104709,
		"name": "Carlópolis",
		"stateCode": "PR"
	},
	{
		"id": 4104808,
		"name": "Cascavel",
		"stateCode": "PR"
	},
	{
		"id": 4104907,
		"name": "Castro",
		"stateCode": "PR"
	},
	{
		"id": 4105003,
		"name": "Catanduvas",
		"stateCode": "PR"
	},
	{
		"id": 4105102,
		"name": "Centenário do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4105201,
		"name": "Cerro Azul",
		"stateCode": "PR"
	},
	{
		"id": 4105300,
		"name": "Céu Azul",
		"stateCode": "PR"
	},
	{
		"id": 4105409,
		"name": "Chopinzinho",
		"stateCode": "PR"
	},
	{
		"id": 4105508,
		"name": "Cianorte",
		"stateCode": "PR"
	},
	{
		"id": 4105607,
		"name": "Cidade Gaúcha",
		"stateCode": "PR"
	},
	{
		"id": 4105706,
		"name": "Clevelândia",
		"stateCode": "PR"
	},
	{
		"id": 4105805,
		"name": "Colombo",
		"stateCode": "PR"
	},
	{
		"id": 4105904,
		"name": "Colorado",
		"stateCode": "PR"
	},
	{
		"id": 4106001,
		"name": "Congonhinhas",
		"stateCode": "PR"
	},
	{
		"id": 4106100,
		"name": "Conselheiro Mairinck",
		"stateCode": "PR"
	},
	{
		"id": 4106209,
		"name": "Contenda",
		"stateCode": "PR"
	},
	{
		"id": 4106308,
		"name": "Corbélia",
		"stateCode": "PR"
	},
	{
		"id": 4106407,
		"name": "Cornélio Procópio",
		"stateCode": "PR"
	},
	{
		"id": 4106456,
		"name": "Coronel Domingos Soares",
		"stateCode": "PR"
	},
	{
		"id": 4106506,
		"name": "Coronel Vivida",
		"stateCode": "PR"
	},
	{
		"id": 4106555,
		"name": "Corumbataí do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4106803,
		"name": "Cruz Machado",
		"stateCode": "PR"
	},
	{
		"id": 4106571,
		"name": "Cruzeiro do Iguaçu",
		"stateCode": "PR"
	},
	{
		"id": 4106605,
		"name": "Cruzeiro do Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4106704,
		"name": "Cruzeiro do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4106852,
		"name": "Cruzmaltina",
		"stateCode": "PR"
	},
	{
		"id": 4106902,
		"name": "Curitiba",
		"stateCode": "PR"
	},
	{
		"id": 4107009,
		"name": "Curiúva",
		"stateCode": "PR"
	},
	{
		"id": 4107157,
		"name": "Diamante D'Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4107108,
		"name": "Diamante do Norte",
		"stateCode": "PR"
	},
	{
		"id": 4107124,
		"name": "Diamante do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4107207,
		"name": "Dois Vizinhos",
		"stateCode": "PR"
	},
	{
		"id": 4107256,
		"name": "Douradina",
		"stateCode": "PR"
	},
	{
		"id": 4107306,
		"name": "Doutor Camargo",
		"stateCode": "PR"
	},
	{
		"id": 4128633,
		"name": "Doutor Ulysses",
		"stateCode": "PR"
	},
	{
		"id": 4107405,
		"name": "Enéas Marques",
		"stateCode": "PR"
	},
	{
		"id": 4107504,
		"name": "Engenheiro Beltrão",
		"stateCode": "PR"
	},
	{
		"id": 4107538,
		"name": "Entre Rios do Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4107520,
		"name": "Esperança Nova",
		"stateCode": "PR"
	},
	{
		"id": 4107546,
		"name": "Espigão Alto do Iguaçu",
		"stateCode": "PR"
	},
	{
		"id": 4107553,
		"name": "Farol",
		"stateCode": "PR"
	},
	{
		"id": 4107603,
		"name": "Faxinal",
		"stateCode": "PR"
	},
	{
		"id": 4107652,
		"name": "Fazenda Rio Grande",
		"stateCode": "PR"
	},
	{
		"id": 4107702,
		"name": "Fênix",
		"stateCode": "PR"
	},
	{
		"id": 4107736,
		"name": "Fernandes Pinheiro",
		"stateCode": "PR"
	},
	{
		"id": 4107751,
		"name": "Figueira",
		"stateCode": "PR"
	},
	{
		"id": 4107850,
		"name": "Flor da Serra do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4107801,
		"name": "Floraí",
		"stateCode": "PR"
	},
	{
		"id": 4107900,
		"name": "Floresta",
		"stateCode": "PR"
	},
	{
		"id": 4108007,
		"name": "Florestópolis",
		"stateCode": "PR"
	},
	{
		"id": 4108106,
		"name": "Flórida",
		"stateCode": "PR"
	},
	{
		"id": 4108205,
		"name": "Formosa do Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4108304,
		"name": "Foz do Iguaçu",
		"stateCode": "PR"
	},
	{
		"id": 4108452,
		"name": "Foz do Jordão",
		"stateCode": "PR"
	},
	{
		"id": 4108320,
		"name": "Francisco Alves",
		"stateCode": "PR"
	},
	{
		"id": 4108403,
		"name": "Francisco Beltrão",
		"stateCode": "PR"
	},
	{
		"id": 4108502,
		"name": "General Carneiro",
		"stateCode": "PR"
	},
	{
		"id": 4108551,
		"name": "Godoy Moreira",
		"stateCode": "PR"
	},
	{
		"id": 4108601,
		"name": "Goioerê",
		"stateCode": "PR"
	},
	{
		"id": 4108650,
		"name": "Goioxim",
		"stateCode": "PR"
	},
	{
		"id": 4108700,
		"name": "Grandes Rios",
		"stateCode": "PR"
	},
	{
		"id": 4108809,
		"name": "Guaíra",
		"stateCode": "PR"
	},
	{
		"id": 4108908,
		"name": "Guairaçá",
		"stateCode": "PR"
	},
	{
		"id": 4108957,
		"name": "Guamiranga",
		"stateCode": "PR"
	},
	{
		"id": 4109005,
		"name": "Guapirama",
		"stateCode": "PR"
	},
	{
		"id": 4109104,
		"name": "Guaporema",
		"stateCode": "PR"
	},
	{
		"id": 4109203,
		"name": "Guaraci",
		"stateCode": "PR"
	},
	{
		"id": 4109302,
		"name": "Guaraniaçu",
		"stateCode": "PR"
	},
	{
		"id": 4109401,
		"name": "Guarapuava",
		"stateCode": "PR"
	},
	{
		"id": 4109500,
		"name": "Guaraqueçaba",
		"stateCode": "PR"
	},
	{
		"id": 4109609,
		"name": "Guaratuba",
		"stateCode": "PR"
	},
	{
		"id": 4109658,
		"name": "Honório Serpa",
		"stateCode": "PR"
	},
	{
		"id": 4109708,
		"name": "Ibaiti",
		"stateCode": "PR"
	},
	{
		"id": 4109757,
		"name": "Ibema",
		"stateCode": "PR"
	},
	{
		"id": 4109807,
		"name": "Ibiporã",
		"stateCode": "PR"
	},
	{
		"id": 4109906,
		"name": "Icaraíma",
		"stateCode": "PR"
	},
	{
		"id": 4110003,
		"name": "Iguaraçu",
		"stateCode": "PR"
	},
	{
		"id": 4110052,
		"name": "Iguatu",
		"stateCode": "PR"
	},
	{
		"id": 4110078,
		"name": "Imbaú",
		"stateCode": "PR"
	},
	{
		"id": 4110102,
		"name": "Imbituva",
		"stateCode": "PR"
	},
	{
		"id": 4110201,
		"name": "Inácio Martins",
		"stateCode": "PR"
	},
	{
		"id": 4110300,
		"name": "Inajá",
		"stateCode": "PR"
	},
	{
		"id": 4110409,
		"name": "Indianópolis",
		"stateCode": "PR"
	},
	{
		"id": 4110508,
		"name": "Ipiranga",
		"stateCode": "PR"
	},
	{
		"id": 4110607,
		"name": "Iporã",
		"stateCode": "PR"
	},
	{
		"id": 4110656,
		"name": "Iracema do Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4110706,
		"name": "Irati",
		"stateCode": "PR"
	},
	{
		"id": 4110805,
		"name": "Iretama",
		"stateCode": "PR"
	},
	{
		"id": 4110904,
		"name": "Itaguajé",
		"stateCode": "PR"
	},
	{
		"id": 4110953,
		"name": "Itaipulândia",
		"stateCode": "PR"
	},
	{
		"id": 4111001,
		"name": "Itambaracá",
		"stateCode": "PR"
	},
	{
		"id": 4111100,
		"name": "Itambé",
		"stateCode": "PR"
	},
	{
		"id": 4111209,
		"name": "Itapejara d'Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4111258,
		"name": "Itaperuçu",
		"stateCode": "PR"
	},
	{
		"id": 4111308,
		"name": "Itaúna do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4111407,
		"name": "Ivaí",
		"stateCode": "PR"
	},
	{
		"id": 4111506,
		"name": "Ivaiporã",
		"stateCode": "PR"
	},
	{
		"id": 4111555,
		"name": "Ivaté",
		"stateCode": "PR"
	},
	{
		"id": 4111605,
		"name": "Ivatuba",
		"stateCode": "PR"
	},
	{
		"id": 4111704,
		"name": "Jaboti",
		"stateCode": "PR"
	},
	{
		"id": 4111803,
		"name": "Jacarezinho",
		"stateCode": "PR"
	},
	{
		"id": 4111902,
		"name": "Jaguapitã",
		"stateCode": "PR"
	},
	{
		"id": 4112009,
		"name": "Jaguariaíva",
		"stateCode": "PR"
	},
	{
		"id": 4112108,
		"name": "Jandaia do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4112207,
		"name": "Janiópolis",
		"stateCode": "PR"
	},
	{
		"id": 4112306,
		"name": "Japira",
		"stateCode": "PR"
	},
	{
		"id": 4112405,
		"name": "Japurá",
		"stateCode": "PR"
	},
	{
		"id": 4112504,
		"name": "Jardim Alegre",
		"stateCode": "PR"
	},
	{
		"id": 4112603,
		"name": "Jardim Olinda",
		"stateCode": "PR"
	},
	{
		"id": 4112702,
		"name": "Jataizinho",
		"stateCode": "PR"
	},
	{
		"id": 4112751,
		"name": "Jesuítas",
		"stateCode": "PR"
	},
	{
		"id": 4112801,
		"name": "Joaquim Távora",
		"stateCode": "PR"
	},
	{
		"id": 4112900,
		"name": "Jundiaí do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4112959,
		"name": "Juranda",
		"stateCode": "PR"
	},
	{
		"id": 4113007,
		"name": "Jussara",
		"stateCode": "PR"
	},
	{
		"id": 4113106,
		"name": "Kaloré",
		"stateCode": "PR"
	},
	{
		"id": 4113205,
		"name": "Lapa",
		"stateCode": "PR"
	},
	{
		"id": 4113254,
		"name": "Laranjal",
		"stateCode": "PR"
	},
	{
		"id": 4113304,
		"name": "Laranjeiras do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4113403,
		"name": "Leópolis",
		"stateCode": "PR"
	},
	{
		"id": 4113429,
		"name": "Lidianópolis",
		"stateCode": "PR"
	},
	{
		"id": 4113452,
		"name": "Lindoeste",
		"stateCode": "PR"
	},
	{
		"id": 4113502,
		"name": "Loanda",
		"stateCode": "PR"
	},
	{
		"id": 4113601,
		"name": "Lobato",
		"stateCode": "PR"
	},
	{
		"id": 4113700,
		"name": "Londrina",
		"stateCode": "PR"
	},
	{
		"id": 4113734,
		"name": "Luiziana",
		"stateCode": "PR"
	},
	{
		"id": 4113759,
		"name": "Lunardelli",
		"stateCode": "PR"
	},
	{
		"id": 4113809,
		"name": "Lupionópolis",
		"stateCode": "PR"
	},
	{
		"id": 4113908,
		"name": "Mallet",
		"stateCode": "PR"
	},
	{
		"id": 4114005,
		"name": "Mamborê",
		"stateCode": "PR"
	},
	{
		"id": 4114104,
		"name": "Mandaguaçu",
		"stateCode": "PR"
	},
	{
		"id": 4114203,
		"name": "Mandaguari",
		"stateCode": "PR"
	},
	{
		"id": 4114302,
		"name": "Mandirituba",
		"stateCode": "PR"
	},
	{
		"id": 4114351,
		"name": "Manfrinópolis",
		"stateCode": "PR"
	},
	{
		"id": 4114401,
		"name": "Mangueirinha",
		"stateCode": "PR"
	},
	{
		"id": 4114500,
		"name": "Manoel Ribas",
		"stateCode": "PR"
	},
	{
		"id": 4114609,
		"name": "Marechal Cândido Rondon",
		"stateCode": "PR"
	},
	{
		"id": 4114708,
		"name": "Maria Helena",
		"stateCode": "PR"
	},
	{
		"id": 4114807,
		"name": "Marialva",
		"stateCode": "PR"
	},
	{
		"id": 4114906,
		"name": "Marilândia do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4115002,
		"name": "Marilena",
		"stateCode": "PR"
	},
	{
		"id": 4115101,
		"name": "Mariluz",
		"stateCode": "PR"
	},
	{
		"id": 4115200,
		"name": "Maringá",
		"stateCode": "PR"
	},
	{
		"id": 4115309,
		"name": "Mariópolis",
		"stateCode": "PR"
	},
	{
		"id": 4115358,
		"name": "Maripá",
		"stateCode": "PR"
	},
	{
		"id": 4115408,
		"name": "Marmeleiro",
		"stateCode": "PR"
	},
	{
		"id": 4115457,
		"name": "Marquinho",
		"stateCode": "PR"
	},
	{
		"id": 4115507,
		"name": "Marumbi",
		"stateCode": "PR"
	},
	{
		"id": 4115606,
		"name": "Matelândia",
		"stateCode": "PR"
	},
	{
		"id": 4115705,
		"name": "Matinhos",
		"stateCode": "PR"
	},
	{
		"id": 4115739,
		"name": "Mato Rico",
		"stateCode": "PR"
	},
	{
		"id": 4115754,
		"name": "Mauá da Serra",
		"stateCode": "PR"
	},
	{
		"id": 4115804,
		"name": "Medianeira",
		"stateCode": "PR"
	},
	{
		"id": 4115853,
		"name": "Mercedes",
		"stateCode": "PR"
	},
	{
		"id": 4115903,
		"name": "Mirador",
		"stateCode": "PR"
	},
	{
		"id": 4116000,
		"name": "Miraselva",
		"stateCode": "PR"
	},
	{
		"id": 4116059,
		"name": "Missal",
		"stateCode": "PR"
	},
	{
		"id": 4116109,
		"name": "Moreira Sales",
		"stateCode": "PR"
	},
	{
		"id": 4116208,
		"name": "Morretes",
		"stateCode": "PR"
	},
	{
		"id": 4116307,
		"name": "Munhoz de Melo",
		"stateCode": "PR"
	},
	{
		"id": 4116406,
		"name": "Nossa Senhora das Graças",
		"stateCode": "PR"
	},
	{
		"id": 4116505,
		"name": "Nova Aliança do Ivaí",
		"stateCode": "PR"
	},
	{
		"id": 4116604,
		"name": "Nova América da Colina",
		"stateCode": "PR"
	},
	{
		"id": 4116703,
		"name": "Nova Aurora",
		"stateCode": "PR"
	},
	{
		"id": 4116802,
		"name": "Nova Cantu",
		"stateCode": "PR"
	},
	{
		"id": 4116901,
		"name": "Nova Esperança",
		"stateCode": "PR"
	},
	{
		"id": 4116950,
		"name": "Nova Esperança do Sudoeste",
		"stateCode": "PR"
	},
	{
		"id": 4117008,
		"name": "Nova Fátima",
		"stateCode": "PR"
	},
	{
		"id": 4117057,
		"name": "Nova Laranjeiras",
		"stateCode": "PR"
	},
	{
		"id": 4117107,
		"name": "Nova Londrina",
		"stateCode": "PR"
	},
	{
		"id": 4117206,
		"name": "Nova Olímpia",
		"stateCode": "PR"
	},
	{
		"id": 4117255,
		"name": "Nova Prata do Iguaçu",
		"stateCode": "PR"
	},
	{
		"id": 4117214,
		"name": "Nova Santa Bárbara",
		"stateCode": "PR"
	},
	{
		"id": 4117222,
		"name": "Nova Santa Rosa",
		"stateCode": "PR"
	},
	{
		"id": 4117271,
		"name": "Nova Tebas",
		"stateCode": "PR"
	},
	{
		"id": 4117297,
		"name": "Novo Itacolomi",
		"stateCode": "PR"
	},
	{
		"id": 4117305,
		"name": "Ortigueira",
		"stateCode": "PR"
	},
	{
		"id": 4117404,
		"name": "Ourizona",
		"stateCode": "PR"
	},
	{
		"id": 4117453,
		"name": "Ouro Verde do Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4117503,
		"name": "Paiçandu",
		"stateCode": "PR"
	},
	{
		"id": 4117602,
		"name": "Palmas",
		"stateCode": "PR"
	},
	{
		"id": 4117701,
		"name": "Palmeira",
		"stateCode": "PR"
	},
	{
		"id": 4117800,
		"name": "Palmital",
		"stateCode": "PR"
	},
	{
		"id": 4117909,
		"name": "Palotina",
		"stateCode": "PR"
	},
	{
		"id": 4118006,
		"name": "Paraíso do Norte",
		"stateCode": "PR"
	},
	{
		"id": 4118105,
		"name": "Paranacity",
		"stateCode": "PR"
	},
	{
		"id": 4118204,
		"name": "Paranaguá",
		"stateCode": "PR"
	},
	{
		"id": 4118303,
		"name": "Paranapoema",
		"stateCode": "PR"
	},
	{
		"id": 4118402,
		"name": "Paranavaí",
		"stateCode": "PR"
	},
	{
		"id": 4118451,
		"name": "Pato Bragado",
		"stateCode": "PR"
	},
	{
		"id": 4118501,
		"name": "Pato Branco",
		"stateCode": "PR"
	},
	{
		"id": 4118600,
		"name": "Paula Freitas",
		"stateCode": "PR"
	},
	{
		"id": 4118709,
		"name": "Paulo Frontin",
		"stateCode": "PR"
	},
	{
		"id": 4118808,
		"name": "Peabiru",
		"stateCode": "PR"
	},
	{
		"id": 4118857,
		"name": "Perobal",
		"stateCode": "PR"
	},
	{
		"id": 4118907,
		"name": "Pérola",
		"stateCode": "PR"
	},
	{
		"id": 4119004,
		"name": "Pérola d'Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4119103,
		"name": "Piên",
		"stateCode": "PR"
	},
	{
		"id": 4119152,
		"name": "Pinhais",
		"stateCode": "PR"
	},
	{
		"id": 4119251,
		"name": "Pinhal de São Bento",
		"stateCode": "PR"
	},
	{
		"id": 4119202,
		"name": "Pinhalão",
		"stateCode": "PR"
	},
	{
		"id": 4119301,
		"name": "Pinhão",
		"stateCode": "PR"
	},
	{
		"id": 4119400,
		"name": "Piraí do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4119509,
		"name": "Piraquara",
		"stateCode": "PR"
	},
	{
		"id": 4119608,
		"name": "Pitanga",
		"stateCode": "PR"
	},
	{
		"id": 4119657,
		"name": "Pitangueiras",
		"stateCode": "PR"
	},
	{
		"id": 4119707,
		"name": "Planaltina do Paraná",
		"stateCode": "PR"
	},
	{
		"id": 4119806,
		"name": "Planalto",
		"stateCode": "PR"
	},
	{
		"id": 4119905,
		"name": "Ponta Grossa",
		"stateCode": "PR"
	},
	{
		"id": 4119954,
		"name": "Pontal do Paraná",
		"stateCode": "PR"
	},
	{
		"id": 4120002,
		"name": "Porecatu",
		"stateCode": "PR"
	},
	{
		"id": 4120101,
		"name": "Porto Amazonas",
		"stateCode": "PR"
	},
	{
		"id": 4120150,
		"name": "Porto Barreiro",
		"stateCode": "PR"
	},
	{
		"id": 4120200,
		"name": "Porto Rico",
		"stateCode": "PR"
	},
	{
		"id": 4120309,
		"name": "Porto Vitória",
		"stateCode": "PR"
	},
	{
		"id": 4120333,
		"name": "Prado Ferreira",
		"stateCode": "PR"
	},
	{
		"id": 4120358,
		"name": "Pranchita",
		"stateCode": "PR"
	},
	{
		"id": 4120408,
		"name": "Presidente Castelo Branco",
		"stateCode": "PR"
	},
	{
		"id": 4120507,
		"name": "Primeiro de Maio",
		"stateCode": "PR"
	},
	{
		"id": 4120606,
		"name": "Prudentópolis",
		"stateCode": "PR"
	},
	{
		"id": 4120655,
		"name": "Quarto Centenário",
		"stateCode": "PR"
	},
	{
		"id": 4120705,
		"name": "Quatiguá",
		"stateCode": "PR"
	},
	{
		"id": 4120804,
		"name": "Quatro Barras",
		"stateCode": "PR"
	},
	{
		"id": 4120853,
		"name": "Quatro Pontes",
		"stateCode": "PR"
	},
	{
		"id": 4120903,
		"name": "Quedas do Iguaçu",
		"stateCode": "PR"
	},
	{
		"id": 4121000,
		"name": "Querência do Norte",
		"stateCode": "PR"
	},
	{
		"id": 4121109,
		"name": "Quinta do Sol",
		"stateCode": "PR"
	},
	{
		"id": 4121208,
		"name": "Quitandinha",
		"stateCode": "PR"
	},
	{
		"id": 4121257,
		"name": "Ramilândia",
		"stateCode": "PR"
	},
	{
		"id": 4121307,
		"name": "Rancho Alegre",
		"stateCode": "PR"
	},
	{
		"id": 4121356,
		"name": "Rancho Alegre D'Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4121406,
		"name": "Realeza",
		"stateCode": "PR"
	},
	{
		"id": 4121505,
		"name": "Rebouças",
		"stateCode": "PR"
	},
	{
		"id": 4121604,
		"name": "Renascença",
		"stateCode": "PR"
	},
	{
		"id": 4121703,
		"name": "Reserva",
		"stateCode": "PR"
	},
	{
		"id": 4121752,
		"name": "Reserva do Iguaçu",
		"stateCode": "PR"
	},
	{
		"id": 4121802,
		"name": "Ribeirão Claro",
		"stateCode": "PR"
	},
	{
		"id": 4121901,
		"name": "Ribeirão do Pinhal",
		"stateCode": "PR"
	},
	{
		"id": 4122008,
		"name": "Rio Azul",
		"stateCode": "PR"
	},
	{
		"id": 4122107,
		"name": "Rio Bom",
		"stateCode": "PR"
	},
	{
		"id": 4122156,
		"name": "Rio Bonito do Iguaçu",
		"stateCode": "PR"
	},
	{
		"id": 4122172,
		"name": "Rio Branco do Ivaí",
		"stateCode": "PR"
	},
	{
		"id": 4122206,
		"name": "Rio Branco do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4122305,
		"name": "Rio Negro",
		"stateCode": "PR"
	},
	{
		"id": 4122404,
		"name": "Rolândia",
		"stateCode": "PR"
	},
	{
		"id": 4122503,
		"name": "Roncador",
		"stateCode": "PR"
	},
	{
		"id": 4122602,
		"name": "Rondon",
		"stateCode": "PR"
	},
	{
		"id": 4122651,
		"name": "Rosário do Ivaí",
		"stateCode": "PR"
	},
	{
		"id": 4122701,
		"name": "Sabáudia",
		"stateCode": "PR"
	},
	{
		"id": 4122800,
		"name": "Salgado Filho",
		"stateCode": "PR"
	},
	{
		"id": 4122909,
		"name": "Salto do Itararé",
		"stateCode": "PR"
	},
	{
		"id": 4123006,
		"name": "Salto do Lontra",
		"stateCode": "PR"
	},
	{
		"id": 4123105,
		"name": "Santa Amélia",
		"stateCode": "PR"
	},
	{
		"id": 4123204,
		"name": "Santa Cecília do Pavão",
		"stateCode": "PR"
	},
	{
		"id": 4123303,
		"name": "Santa Cruz de Monte Castelo",
		"stateCode": "PR"
	},
	{
		"id": 4123402,
		"name": "Santa Fé",
		"stateCode": "PR"
	},
	{
		"id": 4123501,
		"name": "Santa Helena",
		"stateCode": "PR"
	},
	{
		"id": 4123600,
		"name": "Santa Inês",
		"stateCode": "PR"
	},
	{
		"id": 4123709,
		"name": "Santa Isabel do Ivaí",
		"stateCode": "PR"
	},
	{
		"id": 4123808,
		"name": "Santa Izabel do Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4123824,
		"name": "Santa Lúcia",
		"stateCode": "PR"
	},
	{
		"id": 4123857,
		"name": "Santa Maria do Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4123907,
		"name": "Santa Mariana",
		"stateCode": "PR"
	},
	{
		"id": 4123956,
		"name": "Santa Mônica",
		"stateCode": "PR"
	},
	{
		"id": 4124020,
		"name": "Santa Tereza do Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4124053,
		"name": "Santa Terezinha de Itaipu",
		"stateCode": "PR"
	},
	{
		"id": 4124004,
		"name": "Santana do Itararé",
		"stateCode": "PR"
	},
	{
		"id": 4124103,
		"name": "Santo Antônio da Platina",
		"stateCode": "PR"
	},
	{
		"id": 4124202,
		"name": "Santo Antônio do Caiuá",
		"stateCode": "PR"
	},
	{
		"id": 4124301,
		"name": "Santo Antônio do Paraíso",
		"stateCode": "PR"
	},
	{
		"id": 4124400,
		"name": "Santo Antônio do Sudoeste",
		"stateCode": "PR"
	},
	{
		"id": 4124509,
		"name": "Santo Inácio",
		"stateCode": "PR"
	},
	{
		"id": 4124608,
		"name": "São Carlos do Ivaí",
		"stateCode": "PR"
	},
	{
		"id": 4124707,
		"name": "São Jerônimo da Serra",
		"stateCode": "PR"
	},
	{
		"id": 4124806,
		"name": "São João",
		"stateCode": "PR"
	},
	{
		"id": 4124905,
		"name": "São João do Caiuá",
		"stateCode": "PR"
	},
	{
		"id": 4125001,
		"name": "São João do Ivaí",
		"stateCode": "PR"
	},
	{
		"id": 4125100,
		"name": "São João do Triunfo",
		"stateCode": "PR"
	},
	{
		"id": 4125209,
		"name": "São Jorge d'Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4125308,
		"name": "São Jorge do Ivaí",
		"stateCode": "PR"
	},
	{
		"id": 4125357,
		"name": "São Jorge do Patrocínio",
		"stateCode": "PR"
	},
	{
		"id": 4125407,
		"name": "São José da Boa Vista",
		"stateCode": "PR"
	},
	{
		"id": 4125456,
		"name": "São José das Palmeiras",
		"stateCode": "PR"
	},
	{
		"id": 4125506,
		"name": "São José dos Pinhais",
		"stateCode": "PR"
	},
	{
		"id": 4125555,
		"name": "São Manoel do Paraná",
		"stateCode": "PR"
	},
	{
		"id": 4125605,
		"name": "São Mateus do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4125704,
		"name": "São Miguel do Iguaçu",
		"stateCode": "PR"
	},
	{
		"id": 4125753,
		"name": "São Pedro do Iguaçu",
		"stateCode": "PR"
	},
	{
		"id": 4125803,
		"name": "São Pedro do Ivaí",
		"stateCode": "PR"
	},
	{
		"id": 4125902,
		"name": "São Pedro do Paraná",
		"stateCode": "PR"
	},
	{
		"id": 4126009,
		"name": "São Sebastião da Amoreira",
		"stateCode": "PR"
	},
	{
		"id": 4126108,
		"name": "São Tomé",
		"stateCode": "PR"
	},
	{
		"id": 4126207,
		"name": "Sapopema",
		"stateCode": "PR"
	},
	{
		"id": 4126256,
		"name": "Sarandi",
		"stateCode": "PR"
	},
	{
		"id": 4126272,
		"name": "Saudade do Iguaçu",
		"stateCode": "PR"
	},
	{
		"id": 4126306,
		"name": "Sengés",
		"stateCode": "PR"
	},
	{
		"id": 4126355,
		"name": "Serranópolis do Iguaçu",
		"stateCode": "PR"
	},
	{
		"id": 4126405,
		"name": "Sertaneja",
		"stateCode": "PR"
	},
	{
		"id": 4126504,
		"name": "Sertanópolis",
		"stateCode": "PR"
	},
	{
		"id": 4126603,
		"name": "Siqueira Campos",
		"stateCode": "PR"
	},
	{
		"id": 4126652,
		"name": "Sulina",
		"stateCode": "PR"
	},
	{
		"id": 4126678,
		"name": "Tamarana",
		"stateCode": "PR"
	},
	{
		"id": 4126702,
		"name": "Tamboara",
		"stateCode": "PR"
	},
	{
		"id": 4126801,
		"name": "Tapejara",
		"stateCode": "PR"
	},
	{
		"id": 4126900,
		"name": "Tapira",
		"stateCode": "PR"
	},
	{
		"id": 4127007,
		"name": "Teixeira Soares",
		"stateCode": "PR"
	},
	{
		"id": 4127106,
		"name": "Telêmaco Borba",
		"stateCode": "PR"
	},
	{
		"id": 4127205,
		"name": "Terra Boa",
		"stateCode": "PR"
	},
	{
		"id": 4127304,
		"name": "Terra Rica",
		"stateCode": "PR"
	},
	{
		"id": 4127403,
		"name": "Terra Roxa",
		"stateCode": "PR"
	},
	{
		"id": 4127502,
		"name": "Tibagi",
		"stateCode": "PR"
	},
	{
		"id": 4127601,
		"name": "Tijucas do Sul",
		"stateCode": "PR"
	},
	{
		"id": 4127700,
		"name": "Toledo",
		"stateCode": "PR"
	},
	{
		"id": 4127809,
		"name": "Tomazina",
		"stateCode": "PR"
	},
	{
		"id": 4127858,
		"name": "Três Barras do Paraná",
		"stateCode": "PR"
	},
	{
		"id": 4127882,
		"name": "Tunas do Paraná",
		"stateCode": "PR"
	},
	{
		"id": 4127908,
		"name": "Tuneiras do Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4127957,
		"name": "Tupãssi",
		"stateCode": "PR"
	},
	{
		"id": 4127965,
		"name": "Turvo",
		"stateCode": "PR"
	},
	{
		"id": 4128005,
		"name": "Ubiratã",
		"stateCode": "PR"
	},
	{
		"id": 4128104,
		"name": "Umuarama",
		"stateCode": "PR"
	},
	{
		"id": 4128203,
		"name": "União da Vitória",
		"stateCode": "PR"
	},
	{
		"id": 4128302,
		"name": "Uniflor",
		"stateCode": "PR"
	},
	{
		"id": 4128401,
		"name": "Uraí",
		"stateCode": "PR"
	},
	{
		"id": 4128534,
		"name": "Ventania",
		"stateCode": "PR"
	},
	{
		"id": 4128559,
		"name": "Vera Cruz do Oeste",
		"stateCode": "PR"
	},
	{
		"id": 4128609,
		"name": "Verê",
		"stateCode": "PR"
	},
	{
		"id": 4128658,
		"name": "Virmond",
		"stateCode": "PR"
	},
	{
		"id": 4128708,
		"name": "Vitorino",
		"stateCode": "PR"
	},
	{
		"id": 4128500,
		"name": "Wenceslau Braz",
		"stateCode": "PR"
	},
	{
		"id": 4128807,
		"name": "Xambrê",
		"stateCode": "PR"
	},
	{
		"id": 3300100,
		"name": "Angra dos Reis",
		"stateCode": "RJ"
	},
	{
		"id": 3300159,
		"name": "Aperibé",
		"stateCode": "RJ"
	},
	{
		"id": 3300209,
		"name": "Araruama",
		"stateCode": "RJ"
	},
	{
		"id": 3300225,
		"name": "Areal",
		"stateCode": "RJ"
	},
	{
		"id": 3300233,
		"name": "Armação dos Búzios",
		"stateCode": "RJ"
	},
	{
		"id": 3300258,
		"name": "Arraial do Cabo",
		"stateCode": "RJ"
	},
	{
		"id": 3300308,
		"name": "Barra do Piraí",
		"stateCode": "RJ"
	},
	{
		"id": 3300407,
		"name": "Barra Mansa",
		"stateCode": "RJ"
	},
	{
		"id": 3300456,
		"name": "Belford Roxo",
		"stateCode": "RJ"
	},
	{
		"id": 3300506,
		"name": "Bom Jardim",
		"stateCode": "RJ"
	},
	{
		"id": 3300605,
		"name": "Bom Jesus do Itabapoana",
		"stateCode": "RJ"
	},
	{
		"id": 3300704,
		"name": "Cabo Frio",
		"stateCode": "RJ"
	},
	{
		"id": 3300803,
		"name": "Cachoeiras de Macacu",
		"stateCode": "RJ"
	},
	{
		"id": 3300902,
		"name": "Cambuci",
		"stateCode": "RJ"
	},
	{
		"id": 3301009,
		"name": "Campos dos Goytacazes",
		"stateCode": "RJ"
	},
	{
		"id": 3301108,
		"name": "Cantagalo",
		"stateCode": "RJ"
	},
	{
		"id": 3300936,
		"name": "Carapebus",
		"stateCode": "RJ"
	},
	{
		"id": 3301157,
		"name": "Cardoso Moreira",
		"stateCode": "RJ"
	},
	{
		"id": 3301207,
		"name": "Carmo",
		"stateCode": "RJ"
	},
	{
		"id": 3301306,
		"name": "Casimiro de Abreu",
		"stateCode": "RJ"
	},
	{
		"id": 3300951,
		"name": "Comendador Levy Gasparian",
		"stateCode": "RJ"
	},
	{
		"id": 3301405,
		"name": "Conceição de Macabu",
		"stateCode": "RJ"
	},
	{
		"id": 3301504,
		"name": "Cordeiro",
		"stateCode": "RJ"
	},
	{
		"id": 3301603,
		"name": "Duas Barras",
		"stateCode": "RJ"
	},
	{
		"id": 3301702,
		"name": "Duque de Caxias",
		"stateCode": "RJ"
	},
	{
		"id": 3301801,
		"name": "Engenheiro Paulo de Frontin",
		"stateCode": "RJ"
	},
	{
		"id": 3301850,
		"name": "Guapimirim",
		"stateCode": "RJ"
	},
	{
		"id": 3301876,
		"name": "Iguaba Grande",
		"stateCode": "RJ"
	},
	{
		"id": 3301900,
		"name": "Itaboraí",
		"stateCode": "RJ"
	},
	{
		"id": 3302007,
		"name": "Itaguaí",
		"stateCode": "RJ"
	},
	{
		"id": 3302056,
		"name": "Italva",
		"stateCode": "RJ"
	},
	{
		"id": 3302106,
		"name": "Itaocara",
		"stateCode": "RJ"
	},
	{
		"id": 3302205,
		"name": "Itaperuna",
		"stateCode": "RJ"
	},
	{
		"id": 3302254,
		"name": "Itatiaia",
		"stateCode": "RJ"
	},
	{
		"id": 3302270,
		"name": "Japeri",
		"stateCode": "RJ"
	},
	{
		"id": 3302304,
		"name": "Laje do Muriaé",
		"stateCode": "RJ"
	},
	{
		"id": 3302403,
		"name": "Macaé",
		"stateCode": "RJ"
	},
	{
		"id": 3302452,
		"name": "Macuco",
		"stateCode": "RJ"
	},
	{
		"id": 3302502,
		"name": "Magé",
		"stateCode": "RJ"
	},
	{
		"id": 3302601,
		"name": "Mangaratiba",
		"stateCode": "RJ"
	},
	{
		"id": 3302700,
		"name": "Maricá",
		"stateCode": "RJ"
	},
	{
		"id": 3302809,
		"name": "Mendes",
		"stateCode": "RJ"
	},
	{
		"id": 3302858,
		"name": "Mesquita",
		"stateCode": "RJ"
	},
	{
		"id": 3302908,
		"name": "Miguel Pereira",
		"stateCode": "RJ"
	},
	{
		"id": 3303005,
		"name": "Miracema",
		"stateCode": "RJ"
	},
	{
		"id": 3303104,
		"name": "Natividade",
		"stateCode": "RJ"
	},
	{
		"id": 3303203,
		"name": "Nilópolis",
		"stateCode": "RJ"
	},
	{
		"id": 3303302,
		"name": "Niterói",
		"stateCode": "RJ"
	},
	{
		"id": 3303401,
		"name": "Nova Friburgo",
		"stateCode": "RJ"
	},
	{
		"id": 3303500,
		"name": "Nova Iguaçu",
		"stateCode": "RJ"
	},
	{
		"id": 3303609,
		"name": "Paracambi",
		"stateCode": "RJ"
	},
	{
		"id": 3303708,
		"name": "Paraíba do Sul",
		"stateCode": "RJ"
	},
	{
		"id": 3303807,
		"name": "Paraty",
		"stateCode": "RJ"
	},
	{
		"id": 3303856,
		"name": "Paty do Alferes",
		"stateCode": "RJ"
	},
	{
		"id": 3303906,
		"name": "Petrópolis",
		"stateCode": "RJ"
	},
	{
		"id": 3303955,
		"name": "Pinheiral",
		"stateCode": "RJ"
	},
	{
		"id": 3304003,
		"name": "Piraí",
		"stateCode": "RJ"
	},
	{
		"id": 3304102,
		"name": "Porciúncula",
		"stateCode": "RJ"
	},
	{
		"id": 3304110,
		"name": "Porto Real",
		"stateCode": "RJ"
	},
	{
		"id": 3304128,
		"name": "Quatis",
		"stateCode": "RJ"
	},
	{
		"id": 3304144,
		"name": "Queimados",
		"stateCode": "RJ"
	},
	{
		"id": 3304151,
		"name": "Quissamã",
		"stateCode": "RJ"
	},
	{
		"id": 3304201,
		"name": "Resende",
		"stateCode": "RJ"
	},
	{
		"id": 3304300,
		"name": "Rio Bonito",
		"stateCode": "RJ"
	},
	{
		"id": 3304409,
		"name": "Rio Claro",
		"stateCode": "RJ"
	},
	{
		"id": 3304508,
		"name": "Rio das Flores",
		"stateCode": "RJ"
	},
	{
		"id": 3304524,
		"name": "Rio das Ostras",
		"stateCode": "RJ"
	},
	{
		"id": 3304557,
		"name": "Rio de Janeiro",
		"stateCode": "RJ"
	},
	{
		"id": 3304607,
		"name": "Santa Maria Madalena",
		"stateCode": "RJ"
	},
	{
		"id": 3304706,
		"name": "Santo Antônio de Pádua",
		"stateCode": "RJ"
	},
	{
		"id": 3304805,
		"name": "São Fidélis",
		"stateCode": "RJ"
	},
	{
		"id": 3304755,
		"name": "São Francisco de Itabapoana",
		"stateCode": "RJ"
	},
	{
		"id": 3304904,
		"name": "São Gonçalo",
		"stateCode": "RJ"
	},
	{
		"id": 3305000,
		"name": "São João da Barra",
		"stateCode": "RJ"
	},
	{
		"id": 3305109,
		"name": "São João de Meriti",
		"stateCode": "RJ"
	},
	{
		"id": 3305133,
		"name": "São José de Ubá",
		"stateCode": "RJ"
	},
	{
		"id": 3305158,
		"name": "São José do Vale do Rio Preto",
		"stateCode": "RJ"
	},
	{
		"id": 3305208,
		"name": "São Pedro da Aldeia",
		"stateCode": "RJ"
	},
	{
		"id": 3305307,
		"name": "São Sebastião do Alto",
		"stateCode": "RJ"
	},
	{
		"id": 3305406,
		"name": "Sapucaia",
		"stateCode": "RJ"
	},
	{
		"id": 3305505,
		"name": "Saquarema",
		"stateCode": "RJ"
	},
	{
		"id": 3305554,
		"name": "Seropédica",
		"stateCode": "RJ"
	},
	{
		"id": 3305604,
		"name": "Silva Jardim",
		"stateCode": "RJ"
	},
	{
		"id": 3305703,
		"name": "Sumidouro",
		"stateCode": "RJ"
	},
	{
		"id": 3305752,
		"name": "Tanguá",
		"stateCode": "RJ"
	},
	{
		"id": 3305802,
		"name": "Teresópolis",
		"stateCode": "RJ"
	},
	{
		"id": 3305901,
		"name": "Trajano de Moraes",
		"stateCode": "RJ"
	},
	{
		"id": 3306008,
		"name": "Três Rios",
		"stateCode": "RJ"
	},
	{
		"id": 3306107,
		"name": "Valença",
		"stateCode": "RJ"
	},
	{
		"id": 3306156,
		"name": "Varre-Sai",
		"stateCode": "RJ"
	},
	{
		"id": 3306206,
		"name": "Vassouras",
		"stateCode": "RJ"
	},
	{
		"id": 3306305,
		"name": "Volta Redonda",
		"stateCode": "RJ"
	},
	{
		"id": 2400109,
		"name": "Acari",
		"stateCode": "RN"
	},
	{
		"id": 2400307,
		"name": "Afonso Bezerra",
		"stateCode": "RN"
	},
	{
		"id": 2400406,
		"name": "Água Nova",
		"stateCode": "RN"
	},
	{
		"id": 2400505,
		"name": "Alexandria",
		"stateCode": "RN"
	},
	{
		"id": 2400604,
		"name": "Almino Afonso",
		"stateCode": "RN"
	},
	{
		"id": 2400703,
		"name": "Alto do Rodrigues",
		"stateCode": "RN"
	},
	{
		"id": 2400802,
		"name": "Angicos",
		"stateCode": "RN"
	},
	{
		"id": 2400901,
		"name": "Antônio Martins",
		"stateCode": "RN"
	},
	{
		"id": 2401008,
		"name": "Apodi",
		"stateCode": "RN"
	},
	{
		"id": 2401107,
		"name": "Areia Branca",
		"stateCode": "RN"
	},
	{
		"id": 2401206,
		"name": "Arez",
		"stateCode": "RN"
	},
	{
		"id": 2400208,
		"name": "Assú",
		"stateCode": "RN"
	},
	{
		"id": 2401404,
		"name": "Baía Formosa",
		"stateCode": "RN"
	},
	{
		"id": 2401453,
		"name": "Baraúna",
		"stateCode": "RN"
	},
	{
		"id": 2401503,
		"name": "Barcelona",
		"stateCode": "RN"
	},
	{
		"id": 2401602,
		"name": "Bento Fernandes",
		"stateCode": "RN"
	},
	{
		"id": 2401651,
		"name": "Bodó",
		"stateCode": "RN"
	},
	{
		"id": 2401701,
		"name": "Bom Jesus",
		"stateCode": "RN"
	},
	{
		"id": 2401800,
		"name": "Brejinho",
		"stateCode": "RN"
	},
	{
		"id": 2401859,
		"name": "Caiçara do Norte",
		"stateCode": "RN"
	},
	{
		"id": 2401909,
		"name": "Caiçara do Rio do Vento",
		"stateCode": "RN"
	},
	{
		"id": 2402006,
		"name": "Caicó",
		"stateCode": "RN"
	},
	{
		"id": 2401305,
		"name": "Campo Grande",
		"stateCode": "RN"
	},
	{
		"id": 2402105,
		"name": "Campo Redondo",
		"stateCode": "RN"
	},
	{
		"id": 2402204,
		"name": "Canguaretama",
		"stateCode": "RN"
	},
	{
		"id": 2402303,
		"name": "Caraúbas",
		"stateCode": "RN"
	},
	{
		"id": 2402402,
		"name": "Carnaúba dos Dantas",
		"stateCode": "RN"
	},
	{
		"id": 2402501,
		"name": "Carnaubais",
		"stateCode": "RN"
	},
	{
		"id": 2402600,
		"name": "Ceará-Mirim",
		"stateCode": "RN"
	},
	{
		"id": 2402709,
		"name": "Cerro Corá",
		"stateCode": "RN"
	},
	{
		"id": 2402808,
		"name": "Coronel Ezequiel",
		"stateCode": "RN"
	},
	{
		"id": 2402907,
		"name": "Coronel João Pessoa",
		"stateCode": "RN"
	},
	{
		"id": 2403004,
		"name": "Cruzeta",
		"stateCode": "RN"
	},
	{
		"id": 2403103,
		"name": "Currais Novos",
		"stateCode": "RN"
	},
	{
		"id": 2403202,
		"name": "Doutor Severiano",
		"stateCode": "RN"
	},
	{
		"id": 2403301,
		"name": "Encanto",
		"stateCode": "RN"
	},
	{
		"id": 2403400,
		"name": "Equador",
		"stateCode": "RN"
	},
	{
		"id": 2403509,
		"name": "Espírito Santo",
		"stateCode": "RN"
	},
	{
		"id": 2403608,
		"name": "Extremoz",
		"stateCode": "RN"
	},
	{
		"id": 2403707,
		"name": "Felipe Guerra",
		"stateCode": "RN"
	},
	{
		"id": 2403756,
		"name": "Fernando Pedroza",
		"stateCode": "RN"
	},
	{
		"id": 2403806,
		"name": "Florânia",
		"stateCode": "RN"
	},
	{
		"id": 2403905,
		"name": "Francisco Dantas",
		"stateCode": "RN"
	},
	{
		"id": 2404002,
		"name": "Frutuoso Gomes",
		"stateCode": "RN"
	},
	{
		"id": 2404101,
		"name": "Galinhos",
		"stateCode": "RN"
	},
	{
		"id": 2404200,
		"name": "Goianinha",
		"stateCode": "RN"
	},
	{
		"id": 2404309,
		"name": "Governador Dix-Sept Rosado",
		"stateCode": "RN"
	},
	{
		"id": 2404408,
		"name": "Grossos",
		"stateCode": "RN"
	},
	{
		"id": 2404507,
		"name": "Guamaré",
		"stateCode": "RN"
	},
	{
		"id": 2404606,
		"name": "Ielmo Marinho",
		"stateCode": "RN"
	},
	{
		"id": 2404705,
		"name": "Ipanguaçu",
		"stateCode": "RN"
	},
	{
		"id": 2404804,
		"name": "Ipueira",
		"stateCode": "RN"
	},
	{
		"id": 2404853,
		"name": "Itajá",
		"stateCode": "RN"
	},
	{
		"id": 2404903,
		"name": "Itaú",
		"stateCode": "RN"
	},
	{
		"id": 2405009,
		"name": "Jaçanã",
		"stateCode": "RN"
	},
	{
		"id": 2405108,
		"name": "Jandaíra",
		"stateCode": "RN"
	},
	{
		"id": 2405207,
		"name": "Janduís",
		"stateCode": "RN"
	},
	{
		"id": 2405306,
		"name": "Januário Cicco",
		"stateCode": "RN"
	},
	{
		"id": 2405405,
		"name": "Japi",
		"stateCode": "RN"
	},
	{
		"id": 2405504,
		"name": "Jardim de Angicos",
		"stateCode": "RN"
	},
	{
		"id": 2405603,
		"name": "Jardim de Piranhas",
		"stateCode": "RN"
	},
	{
		"id": 2405702,
		"name": "Jardim do Seridó",
		"stateCode": "RN"
	},
	{
		"id": 2405801,
		"name": "João Câmara",
		"stateCode": "RN"
	},
	{
		"id": 2405900,
		"name": "João Dias",
		"stateCode": "RN"
	},
	{
		"id": 2406007,
		"name": "José da Penha",
		"stateCode": "RN"
	},
	{
		"id": 2406106,
		"name": "Jucurutu",
		"stateCode": "RN"
	},
	{
		"id": 2406155,
		"name": "Jundiá",
		"stateCode": "RN"
	},
	{
		"id": 2406205,
		"name": "Lagoa d'Anta",
		"stateCode": "RN"
	},
	{
		"id": 2406304,
		"name": "Lagoa de Pedras",
		"stateCode": "RN"
	},
	{
		"id": 2406403,
		"name": "Lagoa de Velhos",
		"stateCode": "RN"
	},
	{
		"id": 2406502,
		"name": "Lagoa Nova",
		"stateCode": "RN"
	},
	{
		"id": 2406601,
		"name": "Lagoa Salgada",
		"stateCode": "RN"
	},
	{
		"id": 2406700,
		"name": "Lajes",
		"stateCode": "RN"
	},
	{
		"id": 2406809,
		"name": "Lajes Pintadas",
		"stateCode": "RN"
	},
	{
		"id": 2406908,
		"name": "Lucrécia",
		"stateCode": "RN"
	},
	{
		"id": 2407005,
		"name": "Luís Gomes",
		"stateCode": "RN"
	},
	{
		"id": 2407104,
		"name": "Macaíba",
		"stateCode": "RN"
	},
	{
		"id": 2407203,
		"name": "Macau",
		"stateCode": "RN"
	},
	{
		"id": 2407252,
		"name": "Major Sales",
		"stateCode": "RN"
	},
	{
		"id": 2407302,
		"name": "Marcelino Vieira",
		"stateCode": "RN"
	},
	{
		"id": 2407401,
		"name": "Martins",
		"stateCode": "RN"
	},
	{
		"id": 2407500,
		"name": "Maxaranguape",
		"stateCode": "RN"
	},
	{
		"id": 2407609,
		"name": "Messias Targino",
		"stateCode": "RN"
	},
	{
		"id": 2407708,
		"name": "Montanhas",
		"stateCode": "RN"
	},
	{
		"id": 2407807,
		"name": "Monte Alegre",
		"stateCode": "RN"
	},
	{
		"id": 2407906,
		"name": "Monte das Gameleiras",
		"stateCode": "RN"
	},
	{
		"id": 2408003,
		"name": "Mossoró",
		"stateCode": "RN"
	},
	{
		"id": 2408102,
		"name": "Natal",
		"stateCode": "RN"
	},
	{
		"id": 2408201,
		"name": "Nísia Floresta",
		"stateCode": "RN"
	},
	{
		"id": 2408300,
		"name": "Nova Cruz",
		"stateCode": "RN"
	},
	{
		"id": 2408409,
		"name": "Olho d'Água do Borges",
		"stateCode": "RN"
	},
	{
		"id": 2408508,
		"name": "Ouro Branco",
		"stateCode": "RN"
	},
	{
		"id": 2408607,
		"name": "Paraná",
		"stateCode": "RN"
	},
	{
		"id": 2408706,
		"name": "Paraú",
		"stateCode": "RN"
	},
	{
		"id": 2408805,
		"name": "Parazinho",
		"stateCode": "RN"
	},
	{
		"id": 2408904,
		"name": "Parelhas",
		"stateCode": "RN"
	},
	{
		"id": 2403251,
		"name": "Parnamirim",
		"stateCode": "RN"
	},
	{
		"id": 2409100,
		"name": "Passa e Fica",
		"stateCode": "RN"
	},
	{
		"id": 2409209,
		"name": "Passagem",
		"stateCode": "RN"
	},
	{
		"id": 2409308,
		"name": "Patu",
		"stateCode": "RN"
	},
	{
		"id": 2409407,
		"name": "Pau dos Ferros",
		"stateCode": "RN"
	},
	{
		"id": 2409506,
		"name": "Pedra Grande",
		"stateCode": "RN"
	},
	{
		"id": 2409605,
		"name": "Pedra Preta",
		"stateCode": "RN"
	},
	{
		"id": 2409704,
		"name": "Pedro Avelino",
		"stateCode": "RN"
	},
	{
		"id": 2409803,
		"name": "Pedro Velho",
		"stateCode": "RN"
	},
	{
		"id": 2409902,
		"name": "Pendências",
		"stateCode": "RN"
	},
	{
		"id": 2410009,
		"name": "Pilões",
		"stateCode": "RN"
	},
	{
		"id": 2410108,
		"name": "Poço Branco",
		"stateCode": "RN"
	},
	{
		"id": 2410207,
		"name": "Portalegre",
		"stateCode": "RN"
	},
	{
		"id": 2410256,
		"name": "Porto do Mangue",
		"stateCode": "RN"
	},
	{
		"id": 2410405,
		"name": "Pureza",
		"stateCode": "RN"
	},
	{
		"id": 2410504,
		"name": "Rafael Fernandes",
		"stateCode": "RN"
	},
	{
		"id": 2410603,
		"name": "Rafael Godeiro",
		"stateCode": "RN"
	},
	{
		"id": 2410702,
		"name": "Riacho da Cruz",
		"stateCode": "RN"
	},
	{
		"id": 2410801,
		"name": "Riacho de Santana",
		"stateCode": "RN"
	},
	{
		"id": 2410900,
		"name": "Riachuelo",
		"stateCode": "RN"
	},
	{
		"id": 2408953,
		"name": "Rio do Fogo",
		"stateCode": "RN"
	},
	{
		"id": 2411007,
		"name": "Rodolfo Fernandes",
		"stateCode": "RN"
	},
	{
		"id": 2411106,
		"name": "Ruy Barbosa",
		"stateCode": "RN"
	},
	{
		"id": 2411205,
		"name": "Santa Cruz",
		"stateCode": "RN"
	},
	{
		"id": 2409332,
		"name": "Santa Maria",
		"stateCode": "RN"
	},
	{
		"id": 2411403,
		"name": "Santana do Matos",
		"stateCode": "RN"
	},
	{
		"id": 2411429,
		"name": "Santana do Seridó",
		"stateCode": "RN"
	},
	{
		"id": 2411502,
		"name": "Santo Antônio",
		"stateCode": "RN"
	},
	{
		"id": 2411601,
		"name": "São Bento do Norte",
		"stateCode": "RN"
	},
	{
		"id": 2411700,
		"name": "São Bento do Trairí",
		"stateCode": "RN"
	},
	{
		"id": 2411809,
		"name": "São Fernando",
		"stateCode": "RN"
	},
	{
		"id": 2411908,
		"name": "São Francisco do Oeste",
		"stateCode": "RN"
	},
	{
		"id": 2412005,
		"name": "São Gonçalo do Amarante",
		"stateCode": "RN"
	},
	{
		"id": 2412104,
		"name": "São João do Sabugi",
		"stateCode": "RN"
	},
	{
		"id": 2412203,
		"name": "São José de Mipibu",
		"stateCode": "RN"
	},
	{
		"id": 2412302,
		"name": "São José do Campestre",
		"stateCode": "RN"
	},
	{
		"id": 2412401,
		"name": "São José do Seridó",
		"stateCode": "RN"
	},
	{
		"id": 2412500,
		"name": "São Miguel",
		"stateCode": "RN"
	},
	{
		"id": 2412559,
		"name": "São Miguel do Gostoso",
		"stateCode": "RN"
	},
	{
		"id": 2412609,
		"name": "São Paulo do Potengi",
		"stateCode": "RN"
	},
	{
		"id": 2412708,
		"name": "São Pedro",
		"stateCode": "RN"
	},
	{
		"id": 2412807,
		"name": "São Rafael",
		"stateCode": "RN"
	},
	{
		"id": 2412906,
		"name": "São Tomé",
		"stateCode": "RN"
	},
	{
		"id": 2413003,
		"name": "São Vicente",
		"stateCode": "RN"
	},
	{
		"id": 2413102,
		"name": "Senador Elói de Souza",
		"stateCode": "RN"
	},
	{
		"id": 2413201,
		"name": "Senador Georgino Avelino",
		"stateCode": "RN"
	},
	{
		"id": 2410306,
		"name": "Serra Caiada",
		"stateCode": "RN"
	},
	{
		"id": 2413300,
		"name": "Serra de São Bento",
		"stateCode": "RN"
	},
	{
		"id": 2413359,
		"name": "Serra do Mel",
		"stateCode": "RN"
	},
	{
		"id": 2413409,
		"name": "Serra Negra do Norte",
		"stateCode": "RN"
	},
	{
		"id": 2413508,
		"name": "Serrinha",
		"stateCode": "RN"
	},
	{
		"id": 2413557,
		"name": "Serrinha dos Pintos",
		"stateCode": "RN"
	},
	{
		"id": 2413607,
		"name": "Severiano Melo",
		"stateCode": "RN"
	},
	{
		"id": 2413706,
		"name": "Sítio Novo",
		"stateCode": "RN"
	},
	{
		"id": 2413805,
		"name": "Taboleiro Grande",
		"stateCode": "RN"
	},
	{
		"id": 2413904,
		"name": "Taipu",
		"stateCode": "RN"
	},
	{
		"id": 2414001,
		"name": "Tangará",
		"stateCode": "RN"
	},
	{
		"id": 2414100,
		"name": "Tenente Ananias",
		"stateCode": "RN"
	},
	{
		"id": 2414159,
		"name": "Tenente Laurentino Cruz",
		"stateCode": "RN"
	},
	{
		"id": 2411056,
		"name": "Tibau",
		"stateCode": "RN"
	},
	{
		"id": 2414209,
		"name": "Tibau do Sul",
		"stateCode": "RN"
	},
	{
		"id": 2414308,
		"name": "Timbaúba dos Batistas",
		"stateCode": "RN"
	},
	{
		"id": 2414407,
		"name": "Touros",
		"stateCode": "RN"
	},
	{
		"id": 2414456,
		"name": "Triunfo Potiguar",
		"stateCode": "RN"
	},
	{
		"id": 2414506,
		"name": "Umarizal",
		"stateCode": "RN"
	},
	{
		"id": 2414605,
		"name": "Upanema",
		"stateCode": "RN"
	},
	{
		"id": 2414704,
		"name": "Várzea",
		"stateCode": "RN"
	},
	{
		"id": 2414753,
		"name": "Venha-Ver",
		"stateCode": "RN"
	},
	{
		"id": 2414803,
		"name": "Vera Cruz",
		"stateCode": "RN"
	},
	{
		"id": 2414902,
		"name": "Viçosa",
		"stateCode": "RN"
	},
	{
		"id": 2415008,
		"name": "Vila Flor",
		"stateCode": "RN"
	},
	{
		"id": 1100015,
		"name": "Alta Floresta D'Oeste",
		"stateCode": "RO"
	},
	{
		"id": 1100379,
		"name": "Alto Alegre dos Parecis",
		"stateCode": "RO"
	},
	{
		"id": 1100403,
		"name": "Alto Paraíso",
		"stateCode": "RO"
	},
	{
		"id": 1100346,
		"name": "Alvorada D'Oeste",
		"stateCode": "RO"
	},
	{
		"id": 1100023,
		"name": "Ariquemes",
		"stateCode": "RO"
	},
	{
		"id": 1100452,
		"name": "Buritis",
		"stateCode": "RO"
	},
	{
		"id": 1100031,
		"name": "Cabixi",
		"stateCode": "RO"
	},
	{
		"id": 1100601,
		"name": "Cacaulândia",
		"stateCode": "RO"
	},
	{
		"id": 1100049,
		"name": "Cacoal",
		"stateCode": "RO"
	},
	{
		"id": 1100700,
		"name": "Campo Novo de Rondônia",
		"stateCode": "RO"
	},
	{
		"id": 1100809,
		"name": "Candeias do Jamari",
		"stateCode": "RO"
	},
	{
		"id": 1100908,
		"name": "Castanheiras",
		"stateCode": "RO"
	},
	{
		"id": 1100056,
		"name": "Cerejeiras",
		"stateCode": "RO"
	},
	{
		"id": 1100924,
		"name": "Chupinguaia",
		"stateCode": "RO"
	},
	{
		"id": 1100064,
		"name": "Colorado do Oeste",
		"stateCode": "RO"
	},
	{
		"id": 1100072,
		"name": "Corumbiara",
		"stateCode": "RO"
	},
	{
		"id": 1100080,
		"name": "Costa Marques",
		"stateCode": "RO"
	},
	{
		"id": 1100940,
		"name": "Cujubim",
		"stateCode": "RO"
	},
	{
		"id": 1100098,
		"name": "Espigão D'Oeste",
		"stateCode": "RO"
	},
	{
		"id": 1101005,
		"name": "Governador Jorge Teixeira",
		"stateCode": "RO"
	},
	{
		"id": 1100106,
		"name": "Guajará-Mirim",
		"stateCode": "RO"
	},
	{
		"id": 1101104,
		"name": "Itapuã do Oeste",
		"stateCode": "RO"
	},
	{
		"id": 1100114,
		"name": "Jaru",
		"stateCode": "RO"
	},
	{
		"id": 1100122,
		"name": "Ji-Paraná",
		"stateCode": "RO"
	},
	{
		"id": 1100130,
		"name": "Machadinho D'Oeste",
		"stateCode": "RO"
	},
	{
		"id": 1101203,
		"name": "Ministro Andreazza",
		"stateCode": "RO"
	},
	{
		"id": 1101302,
		"name": "Mirante da Serra",
		"stateCode": "RO"
	},
	{
		"id": 1101401,
		"name": "Monte Negro",
		"stateCode": "RO"
	},
	{
		"id": 1100148,
		"name": "Nova Brasilândia D'Oeste",
		"stateCode": "RO"
	},
	{
		"id": 1100338,
		"name": "Nova Mamoré",
		"stateCode": "RO"
	},
	{
		"id": 1101435,
		"name": "Nova União",
		"stateCode": "RO"
	},
	{
		"id": 1100502,
		"name": "Novo Horizonte do Oeste",
		"stateCode": "RO"
	},
	{
		"id": 1100155,
		"name": "Ouro Preto do Oeste",
		"stateCode": "RO"
	},
	{
		"id": 1101450,
		"name": "Parecis",
		"stateCode": "RO"
	},
	{
		"id": 1100189,
		"name": "Pimenta Bueno",
		"stateCode": "RO"
	},
	{
		"id": 1101468,
		"name": "Pimenteiras do Oeste",
		"stateCode": "RO"
	},
	{
		"id": 1100205,
		"name": "Porto Velho",
		"stateCode": "RO"
	},
	{
		"id": 1100254,
		"name": "Presidente Médici",
		"stateCode": "RO"
	},
	{
		"id": 1101476,
		"name": "Primavera de Rondônia",
		"stateCode": "RO"
	},
	{
		"id": 1100262,
		"name": "Rio Crespo",
		"stateCode": "RO"
	},
	{
		"id": 1100288,
		"name": "Rolim de Moura",
		"stateCode": "RO"
	},
	{
		"id": 1100296,
		"name": "Santa Luzia D'Oeste",
		"stateCode": "RO"
	},
	{
		"id": 1101484,
		"name": "São Felipe D'Oeste",
		"stateCode": "RO"
	},
	{
		"id": 1101492,
		"name": "São Francisco do Guaporé",
		"stateCode": "RO"
	},
	{
		"id": 1100320,
		"name": "São Miguel do Guaporé",
		"stateCode": "RO"
	},
	{
		"id": 1101500,
		"name": "Seringueiras",
		"stateCode": "RO"
	},
	{
		"id": 1101559,
		"name": "Teixeirópolis",
		"stateCode": "RO"
	},
	{
		"id": 1101609,
		"name": "Theobroma",
		"stateCode": "RO"
	},
	{
		"id": 1101708,
		"name": "Urupá",
		"stateCode": "RO"
	},
	{
		"id": 1101757,
		"name": "Vale do Anari",
		"stateCode": "RO"
	},
	{
		"id": 1101807,
		"name": "Vale do Paraíso",
		"stateCode": "RO"
	},
	{
		"id": 1100304,
		"name": "Vilhena",
		"stateCode": "RO"
	},
	{
		"id": 1400050,
		"name": "Alto Alegre",
		"stateCode": "RR"
	},
	{
		"id": 1400027,
		"name": "Amajari",
		"stateCode": "RR"
	},
	{
		"id": 1400100,
		"name": "Boa Vista",
		"stateCode": "RR"
	},
	{
		"id": 1400159,
		"name": "Bonfim",
		"stateCode": "RR"
	},
	{
		"id": 1400175,
		"name": "Cantá",
		"stateCode": "RR"
	},
	{
		"id": 1400209,
		"name": "Caracaraí",
		"stateCode": "RR"
	},
	{
		"id": 1400233,
		"name": "Caroebe",
		"stateCode": "RR"
	},
	{
		"id": 1400282,
		"name": "Iracema",
		"stateCode": "RR"
	},
	{
		"id": 1400308,
		"name": "Mucajaí",
		"stateCode": "RR"
	},
	{
		"id": 1400407,
		"name": "Normandia",
		"stateCode": "RR"
	},
	{
		"id": 1400456,
		"name": "Pacaraima",
		"stateCode": "RR"
	},
	{
		"id": 1400472,
		"name": "Rorainópolis",
		"stateCode": "RR"
	},
	{
		"id": 1400506,
		"name": "São João da Baliza",
		"stateCode": "RR"
	},
	{
		"id": 1400605,
		"name": "São Luiz do Anauá",
		"stateCode": "RR"
	},
	{
		"id": 1400704,
		"name": "Uiramutã",
		"stateCode": "RR"
	},
	{
		"id": 4300034,
		"name": "Aceguá",
		"stateCode": "RS"
	},
	{
		"id": 4300059,
		"name": "Água Santa",
		"stateCode": "RS"
	},
	{
		"id": 4300109,
		"name": "Agudo",
		"stateCode": "RS"
	},
	{
		"id": 4300208,
		"name": "Ajuricaba",
		"stateCode": "RS"
	},
	{
		"id": 4300307,
		"name": "Alecrim",
		"stateCode": "RS"
	},
	{
		"id": 4300406,
		"name": "Alegrete",
		"stateCode": "RS"
	},
	{
		"id": 4300455,
		"name": "Alegria",
		"stateCode": "RS"
	},
	{
		"id": 4300471,
		"name": "Almirante Tamandaré do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4300505,
		"name": "Alpestre",
		"stateCode": "RS"
	},
	{
		"id": 4300554,
		"name": "Alto Alegre",
		"stateCode": "RS"
	},
	{
		"id": 4300570,
		"name": "Alto Feliz",
		"stateCode": "RS"
	},
	{
		"id": 4300604,
		"name": "Alvorada",
		"stateCode": "RS"
	},
	{
		"id": 4300638,
		"name": "Amaral Ferrador",
		"stateCode": "RS"
	},
	{
		"id": 4300646,
		"name": "Ametista do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4300661,
		"name": "André da Rocha",
		"stateCode": "RS"
	},
	{
		"id": 4300703,
		"name": "Anta Gorda",
		"stateCode": "RS"
	},
	{
		"id": 4300802,
		"name": "Antônio Prado",
		"stateCode": "RS"
	},
	{
		"id": 4300851,
		"name": "Arambaré",
		"stateCode": "RS"
	},
	{
		"id": 4300877,
		"name": "Araricá",
		"stateCode": "RS"
	},
	{
		"id": 4300901,
		"name": "Aratiba",
		"stateCode": "RS"
	},
	{
		"id": 4301008,
		"name": "Arroio do Meio",
		"stateCode": "RS"
	},
	{
		"id": 4301073,
		"name": "Arroio do Padre",
		"stateCode": "RS"
	},
	{
		"id": 4301057,
		"name": "Arroio do Sal",
		"stateCode": "RS"
	},
	{
		"id": 4301206,
		"name": "Arroio do Tigre",
		"stateCode": "RS"
	},
	{
		"id": 4301107,
		"name": "Arroio dos Ratos",
		"stateCode": "RS"
	},
	{
		"id": 4301305,
		"name": "Arroio Grande",
		"stateCode": "RS"
	},
	{
		"id": 4301404,
		"name": "Arvorezinha",
		"stateCode": "RS"
	},
	{
		"id": 4301503,
		"name": "Augusto Pestana",
		"stateCode": "RS"
	},
	{
		"id": 4301552,
		"name": "Áurea",
		"stateCode": "RS"
	},
	{
		"id": 4301602,
		"name": "Bagé",
		"stateCode": "RS"
	},
	{
		"id": 4301636,
		"name": "Balneário Pinhal",
		"stateCode": "RS"
	},
	{
		"id": 4301651,
		"name": "Barão",
		"stateCode": "RS"
	},
	{
		"id": 4301701,
		"name": "Barão de Cotegipe",
		"stateCode": "RS"
	},
	{
		"id": 4301750,
		"name": "Barão do Triunfo",
		"stateCode": "RS"
	},
	{
		"id": 4301859,
		"name": "Barra do Guarita",
		"stateCode": "RS"
	},
	{
		"id": 4301875,
		"name": "Barra do Quaraí",
		"stateCode": "RS"
	},
	{
		"id": 4301909,
		"name": "Barra do Ribeiro",
		"stateCode": "RS"
	},
	{
		"id": 4301925,
		"name": "Barra do Rio Azul",
		"stateCode": "RS"
	},
	{
		"id": 4301958,
		"name": "Barra Funda",
		"stateCode": "RS"
	},
	{
		"id": 4301800,
		"name": "Barracão",
		"stateCode": "RS"
	},
	{
		"id": 4302006,
		"name": "Barros Cassal",
		"stateCode": "RS"
	},
	{
		"id": 4302055,
		"name": "Benjamin Constant do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4302105,
		"name": "Bento Gonçalves",
		"stateCode": "RS"
	},
	{
		"id": 4302154,
		"name": "Boa Vista das Missões",
		"stateCode": "RS"
	},
	{
		"id": 4302204,
		"name": "Boa Vista do Buricá",
		"stateCode": "RS"
	},
	{
		"id": 4302220,
		"name": "Boa Vista do Cadeado",
		"stateCode": "RS"
	},
	{
		"id": 4302238,
		"name": "Boa Vista do Incra",
		"stateCode": "RS"
	},
	{
		"id": 4302253,
		"name": "Boa Vista do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4302303,
		"name": "Bom Jesus",
		"stateCode": "RS"
	},
	{
		"id": 4302352,
		"name": "Bom Princípio",
		"stateCode": "RS"
	},
	{
		"id": 4302378,
		"name": "Bom Progresso",
		"stateCode": "RS"
	},
	{
		"id": 4302402,
		"name": "Bom Retiro do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4302451,
		"name": "Boqueirão do Leão",
		"stateCode": "RS"
	},
	{
		"id": 4302501,
		"name": "Bossoroca",
		"stateCode": "RS"
	},
	{
		"id": 4302584,
		"name": "Bozano",
		"stateCode": "RS"
	},
	{
		"id": 4302600,
		"name": "Braga",
		"stateCode": "RS"
	},
	{
		"id": 4302659,
		"name": "Brochier",
		"stateCode": "RS"
	},
	{
		"id": 4302709,
		"name": "Butiá",
		"stateCode": "RS"
	},
	{
		"id": 4302808,
		"name": "Caçapava do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4302907,
		"name": "Cacequi",
		"stateCode": "RS"
	},
	{
		"id": 4303004,
		"name": "Cachoeira do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4303103,
		"name": "Cachoeirinha",
		"stateCode": "RS"
	},
	{
		"id": 4303202,
		"name": "Cacique Doble",
		"stateCode": "RS"
	},
	{
		"id": 4303301,
		"name": "Caibaté",
		"stateCode": "RS"
	},
	{
		"id": 4303400,
		"name": "Caiçara",
		"stateCode": "RS"
	},
	{
		"id": 4303509,
		"name": "Camaquã",
		"stateCode": "RS"
	},
	{
		"id": 4303558,
		"name": "Camargo",
		"stateCode": "RS"
	},
	{
		"id": 4303608,
		"name": "Cambará do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4303673,
		"name": "Campestre da Serra",
		"stateCode": "RS"
	},
	{
		"id": 4303707,
		"name": "Campina das Missões",
		"stateCode": "RS"
	},
	{
		"id": 4303806,
		"name": "Campinas do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4303905,
		"name": "Campo Bom",
		"stateCode": "RS"
	},
	{
		"id": 4304002,
		"name": "Campo Novo",
		"stateCode": "RS"
	},
	{
		"id": 4304101,
		"name": "Campos Borges",
		"stateCode": "RS"
	},
	{
		"id": 4304200,
		"name": "Candelária",
		"stateCode": "RS"
	},
	{
		"id": 4304309,
		"name": "Cândido Godói",
		"stateCode": "RS"
	},
	{
		"id": 4304358,
		"name": "Candiota",
		"stateCode": "RS"
	},
	{
		"id": 4304408,
		"name": "Canela",
		"stateCode": "RS"
	},
	{
		"id": 4304507,
		"name": "Canguçu",
		"stateCode": "RS"
	},
	{
		"id": 4304606,
		"name": "Canoas",
		"stateCode": "RS"
	},
	{
		"id": 4304614,
		"name": "Canudos do Vale",
		"stateCode": "RS"
	},
	{
		"id": 4304622,
		"name": "Capão Bonito do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4304630,
		"name": "Capão da Canoa",
		"stateCode": "RS"
	},
	{
		"id": 4304655,
		"name": "Capão do Cipó",
		"stateCode": "RS"
	},
	{
		"id": 4304663,
		"name": "Capão do Leão",
		"stateCode": "RS"
	},
	{
		"id": 4304689,
		"name": "Capela de Santana",
		"stateCode": "RS"
	},
	{
		"id": 4304697,
		"name": "Capitão",
		"stateCode": "RS"
	},
	{
		"id": 4304671,
		"name": "Capivari do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4304713,
		"name": "Caraá",
		"stateCode": "RS"
	},
	{
		"id": 4304705,
		"name": "Carazinho",
		"stateCode": "RS"
	},
	{
		"id": 4304804,
		"name": "Carlos Barbosa",
		"stateCode": "RS"
	},
	{
		"id": 4304853,
		"name": "Carlos Gomes",
		"stateCode": "RS"
	},
	{
		"id": 4304903,
		"name": "Casca",
		"stateCode": "RS"
	},
	{
		"id": 4304952,
		"name": "Caseiros",
		"stateCode": "RS"
	},
	{
		"id": 4305009,
		"name": "Catuípe",
		"stateCode": "RS"
	},
	{
		"id": 4305108,
		"name": "Caxias do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4305116,
		"name": "Centenário",
		"stateCode": "RS"
	},
	{
		"id": 4305124,
		"name": "Cerrito",
		"stateCode": "RS"
	},
	{
		"id": 4305132,
		"name": "Cerro Branco",
		"stateCode": "RS"
	},
	{
		"id": 4305157,
		"name": "Cerro Grande",
		"stateCode": "RS"
	},
	{
		"id": 4305173,
		"name": "Cerro Grande do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4305207,
		"name": "Cerro Largo",
		"stateCode": "RS"
	},
	{
		"id": 4305306,
		"name": "Chapada",
		"stateCode": "RS"
	},
	{
		"id": 4305355,
		"name": "Charqueadas",
		"stateCode": "RS"
	},
	{
		"id": 4305371,
		"name": "Charrua",
		"stateCode": "RS"
	},
	{
		"id": 4305405,
		"name": "Chiapetta",
		"stateCode": "RS"
	},
	{
		"id": 4305439,
		"name": "Chuí",
		"stateCode": "RS"
	},
	{
		"id": 4305447,
		"name": "Chuvisca",
		"stateCode": "RS"
	},
	{
		"id": 4305454,
		"name": "Cidreira",
		"stateCode": "RS"
	},
	{
		"id": 4305504,
		"name": "Ciríaco",
		"stateCode": "RS"
	},
	{
		"id": 4305587,
		"name": "Colinas",
		"stateCode": "RS"
	},
	{
		"id": 4305603,
		"name": "Colorado",
		"stateCode": "RS"
	},
	{
		"id": 4305702,
		"name": "Condor",
		"stateCode": "RS"
	},
	{
		"id": 4305801,
		"name": "Constantina",
		"stateCode": "RS"
	},
	{
		"id": 4305835,
		"name": "Coqueiro Baixo",
		"stateCode": "RS"
	},
	{
		"id": 4305850,
		"name": "Coqueiros do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4305871,
		"name": "Coronel Barros",
		"stateCode": "RS"
	},
	{
		"id": 4305900,
		"name": "Coronel Bicaco",
		"stateCode": "RS"
	},
	{
		"id": 4305934,
		"name": "Coronel Pilar",
		"stateCode": "RS"
	},
	{
		"id": 4305959,
		"name": "Cotiporã",
		"stateCode": "RS"
	},
	{
		"id": 4305975,
		"name": "Coxilha",
		"stateCode": "RS"
	},
	{
		"id": 4306007,
		"name": "Crissiumal",
		"stateCode": "RS"
	},
	{
		"id": 4306056,
		"name": "Cristal",
		"stateCode": "RS"
	},
	{
		"id": 4306072,
		"name": "Cristal do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4306106,
		"name": "Cruz Alta",
		"stateCode": "RS"
	},
	{
		"id": 4306130,
		"name": "Cruzaltense",
		"stateCode": "RS"
	},
	{
		"id": 4306205,
		"name": "Cruzeiro do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4306304,
		"name": "David Canabarro",
		"stateCode": "RS"
	},
	{
		"id": 4306320,
		"name": "Derrubadas",
		"stateCode": "RS"
	},
	{
		"id": 4306353,
		"name": "Dezesseis de Novembro",
		"stateCode": "RS"
	},
	{
		"id": 4306379,
		"name": "Dilermando de Aguiar",
		"stateCode": "RS"
	},
	{
		"id": 4306403,
		"name": "Dois Irmãos",
		"stateCode": "RS"
	},
	{
		"id": 4306429,
		"name": "Dois Irmãos das Missões",
		"stateCode": "RS"
	},
	{
		"id": 4306452,
		"name": "Dois Lajeados",
		"stateCode": "RS"
	},
	{
		"id": 4306502,
		"name": "Dom Feliciano",
		"stateCode": "RS"
	},
	{
		"id": 4306601,
		"name": "Dom Pedrito",
		"stateCode": "RS"
	},
	{
		"id": 4306551,
		"name": "Dom Pedro de Alcântara",
		"stateCode": "RS"
	},
	{
		"id": 4306700,
		"name": "Dona Francisca",
		"stateCode": "RS"
	},
	{
		"id": 4306734,
		"name": "Doutor Maurício Cardoso",
		"stateCode": "RS"
	},
	{
		"id": 4306759,
		"name": "Doutor Ricardo",
		"stateCode": "RS"
	},
	{
		"id": 4306767,
		"name": "Eldorado do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4306809,
		"name": "Encantado",
		"stateCode": "RS"
	},
	{
		"id": 4306908,
		"name": "Encruzilhada do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4306924,
		"name": "Engenho Velho",
		"stateCode": "RS"
	},
	{
		"id": 4306957,
		"name": "Entre Rios do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4306932,
		"name": "Entre-Ijuís",
		"stateCode": "RS"
	},
	{
		"id": 4306973,
		"name": "Erebango",
		"stateCode": "RS"
	},
	{
		"id": 4307005,
		"name": "Erechim",
		"stateCode": "RS"
	},
	{
		"id": 4307054,
		"name": "Ernestina",
		"stateCode": "RS"
	},
	{
		"id": 4307203,
		"name": "Erval Grande",
		"stateCode": "RS"
	},
	{
		"id": 4307302,
		"name": "Erval Seco",
		"stateCode": "RS"
	},
	{
		"id": 4307401,
		"name": "Esmeralda",
		"stateCode": "RS"
	},
	{
		"id": 4307450,
		"name": "Esperança do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4307500,
		"name": "Espumoso",
		"stateCode": "RS"
	},
	{
		"id": 4307559,
		"name": "Estação",
		"stateCode": "RS"
	},
	{
		"id": 4307609,
		"name": "Estância Velha",
		"stateCode": "RS"
	},
	{
		"id": 4307708,
		"name": "Esteio",
		"stateCode": "RS"
	},
	{
		"id": 4307807,
		"name": "Estrela",
		"stateCode": "RS"
	},
	{
		"id": 4307815,
		"name": "Estrela Velha",
		"stateCode": "RS"
	},
	{
		"id": 4307831,
		"name": "Eugênio de Castro",
		"stateCode": "RS"
	},
	{
		"id": 4307864,
		"name": "Fagundes Varela",
		"stateCode": "RS"
	},
	{
		"id": 4307906,
		"name": "Farroupilha",
		"stateCode": "RS"
	},
	{
		"id": 4308003,
		"name": "Faxinal do Soturno",
		"stateCode": "RS"
	},
	{
		"id": 4308052,
		"name": "Faxinalzinho",
		"stateCode": "RS"
	},
	{
		"id": 4308078,
		"name": "Fazenda Vilanova",
		"stateCode": "RS"
	},
	{
		"id": 4308102,
		"name": "Feliz",
		"stateCode": "RS"
	},
	{
		"id": 4308201,
		"name": "Flores da Cunha",
		"stateCode": "RS"
	},
	{
		"id": 4308250,
		"name": "Floriano Peixoto",
		"stateCode": "RS"
	},
	{
		"id": 4308300,
		"name": "Fontoura Xavier",
		"stateCode": "RS"
	},
	{
		"id": 4308409,
		"name": "Formigueiro",
		"stateCode": "RS"
	},
	{
		"id": 4308433,
		"name": "Forquetinha",
		"stateCode": "RS"
	},
	{
		"id": 4308458,
		"name": "Fortaleza dos Valos",
		"stateCode": "RS"
	},
	{
		"id": 4308508,
		"name": "Frederico Westphalen",
		"stateCode": "RS"
	},
	{
		"id": 4308607,
		"name": "Garibaldi",
		"stateCode": "RS"
	},
	{
		"id": 4308656,
		"name": "Garruchos",
		"stateCode": "RS"
	},
	{
		"id": 4308706,
		"name": "Gaurama",
		"stateCode": "RS"
	},
	{
		"id": 4308805,
		"name": "General Câmara",
		"stateCode": "RS"
	},
	{
		"id": 4308854,
		"name": "Gentil",
		"stateCode": "RS"
	},
	{
		"id": 4308904,
		"name": "Getúlio Vargas",
		"stateCode": "RS"
	},
	{
		"id": 4309001,
		"name": "Giruá",
		"stateCode": "RS"
	},
	{
		"id": 4309050,
		"name": "Glorinha",
		"stateCode": "RS"
	},
	{
		"id": 4309100,
		"name": "Gramado",
		"stateCode": "RS"
	},
	{
		"id": 4309126,
		"name": "Gramado dos Loureiros",
		"stateCode": "RS"
	},
	{
		"id": 4309159,
		"name": "Gramado Xavier",
		"stateCode": "RS"
	},
	{
		"id": 4309209,
		"name": "Gravataí",
		"stateCode": "RS"
	},
	{
		"id": 4309258,
		"name": "Guabiju",
		"stateCode": "RS"
	},
	{
		"id": 4309308,
		"name": "Guaíba",
		"stateCode": "RS"
	},
	{
		"id": 4309407,
		"name": "Guaporé",
		"stateCode": "RS"
	},
	{
		"id": 4309506,
		"name": "Guarani das Missões",
		"stateCode": "RS"
	},
	{
		"id": 4309555,
		"name": "Harmonia",
		"stateCode": "RS"
	},
	{
		"id": 4307104,
		"name": "Herval",
		"stateCode": "RS"
	},
	{
		"id": 4309571,
		"name": "Herveiras",
		"stateCode": "RS"
	},
	{
		"id": 4309605,
		"name": "Horizontina",
		"stateCode": "RS"
	},
	{
		"id": 4309654,
		"name": "Hulha Negra",
		"stateCode": "RS"
	},
	{
		"id": 4309704,
		"name": "Humaitá",
		"stateCode": "RS"
	},
	{
		"id": 4309753,
		"name": "Ibarama",
		"stateCode": "RS"
	},
	{
		"id": 4309803,
		"name": "Ibiaçá",
		"stateCode": "RS"
	},
	{
		"id": 4309902,
		"name": "Ibiraiaras",
		"stateCode": "RS"
	},
	{
		"id": 4309951,
		"name": "Ibirapuitã",
		"stateCode": "RS"
	},
	{
		"id": 4310009,
		"name": "Ibirubá",
		"stateCode": "RS"
	},
	{
		"id": 4310108,
		"name": "Igrejinha",
		"stateCode": "RS"
	},
	{
		"id": 4310207,
		"name": "Ijuí",
		"stateCode": "RS"
	},
	{
		"id": 4310306,
		"name": "Ilópolis",
		"stateCode": "RS"
	},
	{
		"id": 4310330,
		"name": "Imbé",
		"stateCode": "RS"
	},
	{
		"id": 4310363,
		"name": "Imigrante",
		"stateCode": "RS"
	},
	{
		"id": 4310405,
		"name": "Independência",
		"stateCode": "RS"
	},
	{
		"id": 4310413,
		"name": "Inhacorá",
		"stateCode": "RS"
	},
	{
		"id": 4310439,
		"name": "Ipê",
		"stateCode": "RS"
	},
	{
		"id": 4310462,
		"name": "Ipiranga do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4310504,
		"name": "Iraí",
		"stateCode": "RS"
	},
	{
		"id": 4310538,
		"name": "Itaara",
		"stateCode": "RS"
	},
	{
		"id": 4310553,
		"name": "Itacurubi",
		"stateCode": "RS"
	},
	{
		"id": 4310579,
		"name": "Itapuca",
		"stateCode": "RS"
	},
	{
		"id": 4310603,
		"name": "Itaqui",
		"stateCode": "RS"
	},
	{
		"id": 4310652,
		"name": "Itati",
		"stateCode": "RS"
	},
	{
		"id": 4310702,
		"name": "Itatiba do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4310751,
		"name": "Ivorá",
		"stateCode": "RS"
	},
	{
		"id": 4310801,
		"name": "Ivoti",
		"stateCode": "RS"
	},
	{
		"id": 4310850,
		"name": "Jaboticaba",
		"stateCode": "RS"
	},
	{
		"id": 4310876,
		"name": "Jacuizinho",
		"stateCode": "RS"
	},
	{
		"id": 4310900,
		"name": "Jacutinga",
		"stateCode": "RS"
	},
	{
		"id": 4311007,
		"name": "Jaguarão",
		"stateCode": "RS"
	},
	{
		"id": 4311106,
		"name": "Jaguari",
		"stateCode": "RS"
	},
	{
		"id": 4311122,
		"name": "Jaquirana",
		"stateCode": "RS"
	},
	{
		"id": 4311130,
		"name": "Jari",
		"stateCode": "RS"
	},
	{
		"id": 4311155,
		"name": "Jóia",
		"stateCode": "RS"
	},
	{
		"id": 4311205,
		"name": "Júlio de Castilhos",
		"stateCode": "RS"
	},
	{
		"id": 4311239,
		"name": "Lagoa Bonita do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4311270,
		"name": "Lagoa dos Três Cantos",
		"stateCode": "RS"
	},
	{
		"id": 4311304,
		"name": "Lagoa Vermelha",
		"stateCode": "RS"
	},
	{
		"id": 4311254,
		"name": "Lagoão",
		"stateCode": "RS"
	},
	{
		"id": 4311403,
		"name": "Lajeado",
		"stateCode": "RS"
	},
	{
		"id": 4311429,
		"name": "Lajeado do Bugre",
		"stateCode": "RS"
	},
	{
		"id": 4311502,
		"name": "Lavras do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4311601,
		"name": "Liberato Salzano",
		"stateCode": "RS"
	},
	{
		"id": 4311627,
		"name": "Lindolfo Collor",
		"stateCode": "RS"
	},
	{
		"id": 4311643,
		"name": "Linha Nova",
		"stateCode": "RS"
	},
	{
		"id": 4311718,
		"name": "Maçambará",
		"stateCode": "RS"
	},
	{
		"id": 4311700,
		"name": "Machadinho",
		"stateCode": "RS"
	},
	{
		"id": 4311734,
		"name": "Mampituba",
		"stateCode": "RS"
	},
	{
		"id": 4311759,
		"name": "Manoel Viana",
		"stateCode": "RS"
	},
	{
		"id": 4311775,
		"name": "Maquiné",
		"stateCode": "RS"
	},
	{
		"id": 4311791,
		"name": "Maratá",
		"stateCode": "RS"
	},
	{
		"id": 4311809,
		"name": "Marau",
		"stateCode": "RS"
	},
	{
		"id": 4311908,
		"name": "Marcelino Ramos",
		"stateCode": "RS"
	},
	{
		"id": 4311981,
		"name": "Mariana Pimentel",
		"stateCode": "RS"
	},
	{
		"id": 4312005,
		"name": "Mariano Moro",
		"stateCode": "RS"
	},
	{
		"id": 4312054,
		"name": "Marques de Souza",
		"stateCode": "RS"
	},
	{
		"id": 4312104,
		"name": "Mata",
		"stateCode": "RS"
	},
	{
		"id": 4312138,
		"name": "Mato Castelhano",
		"stateCode": "RS"
	},
	{
		"id": 4312153,
		"name": "Mato Leitão",
		"stateCode": "RS"
	},
	{
		"id": 4312179,
		"name": "Mato Queimado",
		"stateCode": "RS"
	},
	{
		"id": 4312203,
		"name": "Maximiliano de Almeida",
		"stateCode": "RS"
	},
	{
		"id": 4312252,
		"name": "Minas do Leão",
		"stateCode": "RS"
	},
	{
		"id": 4312302,
		"name": "Miraguaí",
		"stateCode": "RS"
	},
	{
		"id": 4312351,
		"name": "Montauri",
		"stateCode": "RS"
	},
	{
		"id": 4312377,
		"name": "Monte Alegre dos Campos",
		"stateCode": "RS"
	},
	{
		"id": 4312385,
		"name": "Monte Belo do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4312401,
		"name": "Montenegro",
		"stateCode": "RS"
	},
	{
		"id": 4312427,
		"name": "Mormaço",
		"stateCode": "RS"
	},
	{
		"id": 4312443,
		"name": "Morrinhos do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4312450,
		"name": "Morro Redondo",
		"stateCode": "RS"
	},
	{
		"id": 4312476,
		"name": "Morro Reuter",
		"stateCode": "RS"
	},
	{
		"id": 4312500,
		"name": "Mostardas",
		"stateCode": "RS"
	},
	{
		"id": 4312609,
		"name": "Muçum",
		"stateCode": "RS"
	},
	{
		"id": 4312617,
		"name": "Muitos Capões",
		"stateCode": "RS"
	},
	{
		"id": 4312625,
		"name": "Muliterno",
		"stateCode": "RS"
	},
	{
		"id": 4312658,
		"name": "Não-Me-Toque",
		"stateCode": "RS"
	},
	{
		"id": 4312674,
		"name": "Nicolau Vergueiro",
		"stateCode": "RS"
	},
	{
		"id": 4312708,
		"name": "Nonoai",
		"stateCode": "RS"
	},
	{
		"id": 4312757,
		"name": "Nova Alvorada",
		"stateCode": "RS"
	},
	{
		"id": 4312807,
		"name": "Nova Araçá",
		"stateCode": "RS"
	},
	{
		"id": 4312906,
		"name": "Nova Bassano",
		"stateCode": "RS"
	},
	{
		"id": 4312955,
		"name": "Nova Boa Vista",
		"stateCode": "RS"
	},
	{
		"id": 4313003,
		"name": "Nova Bréscia",
		"stateCode": "RS"
	},
	{
		"id": 4313011,
		"name": "Nova Candelária",
		"stateCode": "RS"
	},
	{
		"id": 4313037,
		"name": "Nova Esperança do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4313060,
		"name": "Nova Hartz",
		"stateCode": "RS"
	},
	{
		"id": 4313086,
		"name": "Nova Pádua",
		"stateCode": "RS"
	},
	{
		"id": 4313102,
		"name": "Nova Palma",
		"stateCode": "RS"
	},
	{
		"id": 4313201,
		"name": "Nova Petrópolis",
		"stateCode": "RS"
	},
	{
		"id": 4313300,
		"name": "Nova Prata",
		"stateCode": "RS"
	},
	{
		"id": 4313334,
		"name": "Nova Ramada",
		"stateCode": "RS"
	},
	{
		"id": 4313359,
		"name": "Nova Roma do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4313375,
		"name": "Nova Santa Rita",
		"stateCode": "RS"
	},
	{
		"id": 4313490,
		"name": "Novo Barreiro",
		"stateCode": "RS"
	},
	{
		"id": 4313391,
		"name": "Novo Cabrais",
		"stateCode": "RS"
	},
	{
		"id": 4313409,
		"name": "Novo Hamburgo",
		"stateCode": "RS"
	},
	{
		"id": 4313425,
		"name": "Novo Machado",
		"stateCode": "RS"
	},
	{
		"id": 4313441,
		"name": "Novo Tiradentes",
		"stateCode": "RS"
	},
	{
		"id": 4313466,
		"name": "Novo Xingu",
		"stateCode": "RS"
	},
	{
		"id": 4313508,
		"name": "Osório",
		"stateCode": "RS"
	},
	{
		"id": 4313607,
		"name": "Paim Filho",
		"stateCode": "RS"
	},
	{
		"id": 4313656,
		"name": "Palmares do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4313706,
		"name": "Palmeira das Missões",
		"stateCode": "RS"
	},
	{
		"id": 4313805,
		"name": "Palmitinho",
		"stateCode": "RS"
	},
	{
		"id": 4313904,
		"name": "Panambi",
		"stateCode": "RS"
	},
	{
		"id": 4313953,
		"name": "Pantano Grande",
		"stateCode": "RS"
	},
	{
		"id": 4314001,
		"name": "Paraí",
		"stateCode": "RS"
	},
	{
		"id": 4314027,
		"name": "Paraíso do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4314035,
		"name": "Pareci Novo",
		"stateCode": "RS"
	},
	{
		"id": 4314050,
		"name": "Parobé",
		"stateCode": "RS"
	},
	{
		"id": 4314068,
		"name": "Passa Sete",
		"stateCode": "RS"
	},
	{
		"id": 4314076,
		"name": "Passo do Sobrado",
		"stateCode": "RS"
	},
	{
		"id": 4314100,
		"name": "Passo Fundo",
		"stateCode": "RS"
	},
	{
		"id": 4314134,
		"name": "Paulo Bento",
		"stateCode": "RS"
	},
	{
		"id": 4314159,
		"name": "Paverama",
		"stateCode": "RS"
	},
	{
		"id": 4314175,
		"name": "Pedras Altas",
		"stateCode": "RS"
	},
	{
		"id": 4314209,
		"name": "Pedro Osório",
		"stateCode": "RS"
	},
	{
		"id": 4314308,
		"name": "Pejuçara",
		"stateCode": "RS"
	},
	{
		"id": 4314407,
		"name": "Pelotas",
		"stateCode": "RS"
	},
	{
		"id": 4314423,
		"name": "Picada Café",
		"stateCode": "RS"
	},
	{
		"id": 4314456,
		"name": "Pinhal",
		"stateCode": "RS"
	},
	{
		"id": 4314464,
		"name": "Pinhal da Serra",
		"stateCode": "RS"
	},
	{
		"id": 4314472,
		"name": "Pinhal Grande",
		"stateCode": "RS"
	},
	{
		"id": 4314498,
		"name": "Pinheirinho do Vale",
		"stateCode": "RS"
	},
	{
		"id": 4314506,
		"name": "Pinheiro Machado",
		"stateCode": "RS"
	},
	{
		"id": 4314548,
		"name": "Pinto Bandeira",
		"stateCode": "RS"
	},
	{
		"id": 4314555,
		"name": "Pirapó",
		"stateCode": "RS"
	},
	{
		"id": 4314605,
		"name": "Piratini",
		"stateCode": "RS"
	},
	{
		"id": 4314704,
		"name": "Planalto",
		"stateCode": "RS"
	},
	{
		"id": 4314753,
		"name": "Poço das Antas",
		"stateCode": "RS"
	},
	{
		"id": 4314779,
		"name": "Pontão",
		"stateCode": "RS"
	},
	{
		"id": 4314787,
		"name": "Ponte Preta",
		"stateCode": "RS"
	},
	{
		"id": 4314803,
		"name": "Portão",
		"stateCode": "RS"
	},
	{
		"id": 4314902,
		"name": "Porto Alegre",
		"stateCode": "RS"
	},
	{
		"id": 4315008,
		"name": "Porto Lucena",
		"stateCode": "RS"
	},
	{
		"id": 4315057,
		"name": "Porto Mauá",
		"stateCode": "RS"
	},
	{
		"id": 4315073,
		"name": "Porto Vera Cruz",
		"stateCode": "RS"
	},
	{
		"id": 4315107,
		"name": "Porto Xavier",
		"stateCode": "RS"
	},
	{
		"id": 4315131,
		"name": "Pouso Novo",
		"stateCode": "RS"
	},
	{
		"id": 4315149,
		"name": "Presidente Lucena",
		"stateCode": "RS"
	},
	{
		"id": 4315156,
		"name": "Progresso",
		"stateCode": "RS"
	},
	{
		"id": 4315172,
		"name": "Protásio Alves",
		"stateCode": "RS"
	},
	{
		"id": 4315206,
		"name": "Putinga",
		"stateCode": "RS"
	},
	{
		"id": 4315305,
		"name": "Quaraí",
		"stateCode": "RS"
	},
	{
		"id": 4315313,
		"name": "Quatro Irmãos",
		"stateCode": "RS"
	},
	{
		"id": 4315321,
		"name": "Quevedos",
		"stateCode": "RS"
	},
	{
		"id": 4315354,
		"name": "Quinze de Novembro",
		"stateCode": "RS"
	},
	{
		"id": 4315404,
		"name": "Redentora",
		"stateCode": "RS"
	},
	{
		"id": 4315453,
		"name": "Relvado",
		"stateCode": "RS"
	},
	{
		"id": 4315503,
		"name": "Restinga Sêca",
		"stateCode": "RS"
	},
	{
		"id": 4315552,
		"name": "Rio dos Índios",
		"stateCode": "RS"
	},
	{
		"id": 4315602,
		"name": "Rio Grande",
		"stateCode": "RS"
	},
	{
		"id": 4315701,
		"name": "Rio Pardo",
		"stateCode": "RS"
	},
	{
		"id": 4315750,
		"name": "Riozinho",
		"stateCode": "RS"
	},
	{
		"id": 4315800,
		"name": "Roca Sales",
		"stateCode": "RS"
	},
	{
		"id": 4315909,
		"name": "Rodeio Bonito",
		"stateCode": "RS"
	},
	{
		"id": 4315958,
		"name": "Rolador",
		"stateCode": "RS"
	},
	{
		"id": 4316006,
		"name": "Rolante",
		"stateCode": "RS"
	},
	{
		"id": 4316105,
		"name": "Ronda Alta",
		"stateCode": "RS"
	},
	{
		"id": 4316204,
		"name": "Rondinha",
		"stateCode": "RS"
	},
	{
		"id": 4316303,
		"name": "Roque Gonzales",
		"stateCode": "RS"
	},
	{
		"id": 4316402,
		"name": "Rosário do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4316428,
		"name": "Sagrada Família",
		"stateCode": "RS"
	},
	{
		"id": 4316436,
		"name": "Saldanha Marinho",
		"stateCode": "RS"
	},
	{
		"id": 4316451,
		"name": "Salto do Jacuí",
		"stateCode": "RS"
	},
	{
		"id": 4316477,
		"name": "Salvador das Missões",
		"stateCode": "RS"
	},
	{
		"id": 4316501,
		"name": "Salvador do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4316600,
		"name": "Sananduva",
		"stateCode": "RS"
	},
	{
		"id": 4317103,
		"name": "Sant'Ana do Livramento",
		"stateCode": "RS"
	},
	{
		"id": 4316709,
		"name": "Santa Bárbara do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4316733,
		"name": "Santa Cecília do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4316758,
		"name": "Santa Clara do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4316808,
		"name": "Santa Cruz do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4316972,
		"name": "Santa Margarida do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4316907,
		"name": "Santa Maria",
		"stateCode": "RS"
	},
	{
		"id": 4316956,
		"name": "Santa Maria do Herval",
		"stateCode": "RS"
	},
	{
		"id": 4317202,
		"name": "Santa Rosa",
		"stateCode": "RS"
	},
	{
		"id": 4317251,
		"name": "Santa Tereza",
		"stateCode": "RS"
	},
	{
		"id": 4317301,
		"name": "Santa Vitória do Palmar",
		"stateCode": "RS"
	},
	{
		"id": 4317004,
		"name": "Santana da Boa Vista",
		"stateCode": "RS"
	},
	{
		"id": 4317400,
		"name": "Santiago",
		"stateCode": "RS"
	},
	{
		"id": 4317509,
		"name": "Santo Ângelo",
		"stateCode": "RS"
	},
	{
		"id": 4317608,
		"name": "Santo Antônio da Patrulha",
		"stateCode": "RS"
	},
	{
		"id": 4317707,
		"name": "Santo Antônio das Missões",
		"stateCode": "RS"
	},
	{
		"id": 4317558,
		"name": "Santo Antônio do Palma",
		"stateCode": "RS"
	},
	{
		"id": 4317756,
		"name": "Santo Antônio do Planalto",
		"stateCode": "RS"
	},
	{
		"id": 4317806,
		"name": "Santo Augusto",
		"stateCode": "RS"
	},
	{
		"id": 4317905,
		"name": "Santo Cristo",
		"stateCode": "RS"
	},
	{
		"id": 4317954,
		"name": "Santo Expedito do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4318002,
		"name": "São Borja",
		"stateCode": "RS"
	},
	{
		"id": 4318051,
		"name": "São Domingos do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4318101,
		"name": "São Francisco de Assis",
		"stateCode": "RS"
	},
	{
		"id": 4318200,
		"name": "São Francisco de Paula",
		"stateCode": "RS"
	},
	{
		"id": 4318309,
		"name": "São Gabriel",
		"stateCode": "RS"
	},
	{
		"id": 4318408,
		"name": "São Jerônimo",
		"stateCode": "RS"
	},
	{
		"id": 4318424,
		"name": "São João da Urtiga",
		"stateCode": "RS"
	},
	{
		"id": 4318432,
		"name": "São João do Polêsine",
		"stateCode": "RS"
	},
	{
		"id": 4318440,
		"name": "São Jorge",
		"stateCode": "RS"
	},
	{
		"id": 4318457,
		"name": "São José das Missões",
		"stateCode": "RS"
	},
	{
		"id": 4318465,
		"name": "São José do Herval",
		"stateCode": "RS"
	},
	{
		"id": 4318481,
		"name": "São José do Hortêncio",
		"stateCode": "RS"
	},
	{
		"id": 4318499,
		"name": "São José do Inhacorá",
		"stateCode": "RS"
	},
	{
		"id": 4318507,
		"name": "São José do Norte",
		"stateCode": "RS"
	},
	{
		"id": 4318606,
		"name": "São José do Ouro",
		"stateCode": "RS"
	},
	{
		"id": 4318614,
		"name": "São José do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4318622,
		"name": "São José dos Ausentes",
		"stateCode": "RS"
	},
	{
		"id": 4318705,
		"name": "São Leopoldo",
		"stateCode": "RS"
	},
	{
		"id": 4318804,
		"name": "São Lourenço do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4318903,
		"name": "São Luiz Gonzaga",
		"stateCode": "RS"
	},
	{
		"id": 4319000,
		"name": "São Marcos",
		"stateCode": "RS"
	},
	{
		"id": 4319109,
		"name": "São Martinho",
		"stateCode": "RS"
	},
	{
		"id": 4319125,
		"name": "São Martinho da Serra",
		"stateCode": "RS"
	},
	{
		"id": 4319158,
		"name": "São Miguel das Missões",
		"stateCode": "RS"
	},
	{
		"id": 4319208,
		"name": "São Nicolau",
		"stateCode": "RS"
	},
	{
		"id": 4319307,
		"name": "São Paulo das Missões",
		"stateCode": "RS"
	},
	{
		"id": 4319356,
		"name": "São Pedro da Serra",
		"stateCode": "RS"
	},
	{
		"id": 4319364,
		"name": "São Pedro das Missões",
		"stateCode": "RS"
	},
	{
		"id": 4319372,
		"name": "São Pedro do Butiá",
		"stateCode": "RS"
	},
	{
		"id": 4319406,
		"name": "São Pedro do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4319505,
		"name": "São Sebastião do Caí",
		"stateCode": "RS"
	},
	{
		"id": 4319604,
		"name": "São Sepé",
		"stateCode": "RS"
	},
	{
		"id": 4319703,
		"name": "São Valentim",
		"stateCode": "RS"
	},
	{
		"id": 4319711,
		"name": "São Valentim do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4319737,
		"name": "São Valério do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4319752,
		"name": "São Vendelino",
		"stateCode": "RS"
	},
	{
		"id": 4319802,
		"name": "São Vicente do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4319901,
		"name": "Sapiranga",
		"stateCode": "RS"
	},
	{
		"id": 4320008,
		"name": "Sapucaia do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4320107,
		"name": "Sarandi",
		"stateCode": "RS"
	},
	{
		"id": 4320206,
		"name": "Seberi",
		"stateCode": "RS"
	},
	{
		"id": 4320230,
		"name": "Sede Nova",
		"stateCode": "RS"
	},
	{
		"id": 4320263,
		"name": "Segredo",
		"stateCode": "RS"
	},
	{
		"id": 4320305,
		"name": "Selbach",
		"stateCode": "RS"
	},
	{
		"id": 4320321,
		"name": "Senador Salgado Filho",
		"stateCode": "RS"
	},
	{
		"id": 4320354,
		"name": "Sentinela do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4320404,
		"name": "Serafina Corrêa",
		"stateCode": "RS"
	},
	{
		"id": 4320453,
		"name": "Sério",
		"stateCode": "RS"
	},
	{
		"id": 4320503,
		"name": "Sertão",
		"stateCode": "RS"
	},
	{
		"id": 4320552,
		"name": "Sertão Santana",
		"stateCode": "RS"
	},
	{
		"id": 4320578,
		"name": "Sete de Setembro",
		"stateCode": "RS"
	},
	{
		"id": 4320602,
		"name": "Severiano de Almeida",
		"stateCode": "RS"
	},
	{
		"id": 4320651,
		"name": "Silveira Martins",
		"stateCode": "RS"
	},
	{
		"id": 4320677,
		"name": "Sinimbu",
		"stateCode": "RS"
	},
	{
		"id": 4320701,
		"name": "Sobradinho",
		"stateCode": "RS"
	},
	{
		"id": 4320800,
		"name": "Soledade",
		"stateCode": "RS"
	},
	{
		"id": 4320859,
		"name": "Tabaí",
		"stateCode": "RS"
	},
	{
		"id": 4320909,
		"name": "Tapejara",
		"stateCode": "RS"
	},
	{
		"id": 4321006,
		"name": "Tapera",
		"stateCode": "RS"
	},
	{
		"id": 4321105,
		"name": "Tapes",
		"stateCode": "RS"
	},
	{
		"id": 4321204,
		"name": "Taquara",
		"stateCode": "RS"
	},
	{
		"id": 4321303,
		"name": "Taquari",
		"stateCode": "RS"
	},
	{
		"id": 4321329,
		"name": "Taquaruçu do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4321352,
		"name": "Tavares",
		"stateCode": "RS"
	},
	{
		"id": 4321402,
		"name": "Tenente Portela",
		"stateCode": "RS"
	},
	{
		"id": 4321436,
		"name": "Terra de Areia",
		"stateCode": "RS"
	},
	{
		"id": 4321451,
		"name": "Teutônia",
		"stateCode": "RS"
	},
	{
		"id": 4321469,
		"name": "Tio Hugo",
		"stateCode": "RS"
	},
	{
		"id": 4321477,
		"name": "Tiradentes do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4321493,
		"name": "Toropi",
		"stateCode": "RS"
	},
	{
		"id": 4321501,
		"name": "Torres",
		"stateCode": "RS"
	},
	{
		"id": 4321600,
		"name": "Tramandaí",
		"stateCode": "RS"
	},
	{
		"id": 4321626,
		"name": "Travesseiro",
		"stateCode": "RS"
	},
	{
		"id": 4321634,
		"name": "Três Arroios",
		"stateCode": "RS"
	},
	{
		"id": 4321667,
		"name": "Três Cachoeiras",
		"stateCode": "RS"
	},
	{
		"id": 4321709,
		"name": "Três Coroas",
		"stateCode": "RS"
	},
	{
		"id": 4321808,
		"name": "Três de Maio",
		"stateCode": "RS"
	},
	{
		"id": 4321832,
		"name": "Três Forquilhas",
		"stateCode": "RS"
	},
	{
		"id": 4321857,
		"name": "Três Palmeiras",
		"stateCode": "RS"
	},
	{
		"id": 4321907,
		"name": "Três Passos",
		"stateCode": "RS"
	},
	{
		"id": 4321956,
		"name": "Trindade do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4322004,
		"name": "Triunfo",
		"stateCode": "RS"
	},
	{
		"id": 4322103,
		"name": "Tucunduva",
		"stateCode": "RS"
	},
	{
		"id": 4322152,
		"name": "Tunas",
		"stateCode": "RS"
	},
	{
		"id": 4322186,
		"name": "Tupanci do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4322202,
		"name": "Tupanciretã",
		"stateCode": "RS"
	},
	{
		"id": 4322251,
		"name": "Tupandi",
		"stateCode": "RS"
	},
	{
		"id": 4322301,
		"name": "Tuparendi",
		"stateCode": "RS"
	},
	{
		"id": 4322327,
		"name": "Turuçu",
		"stateCode": "RS"
	},
	{
		"id": 4322343,
		"name": "Ubiretama",
		"stateCode": "RS"
	},
	{
		"id": 4322350,
		"name": "União da Serra",
		"stateCode": "RS"
	},
	{
		"id": 4322376,
		"name": "Unistalda",
		"stateCode": "RS"
	},
	{
		"id": 4322400,
		"name": "Uruguaiana",
		"stateCode": "RS"
	},
	{
		"id": 4322509,
		"name": "Vacaria",
		"stateCode": "RS"
	},
	{
		"id": 4322533,
		"name": "Vale do Sol",
		"stateCode": "RS"
	},
	{
		"id": 4322541,
		"name": "Vale Real",
		"stateCode": "RS"
	},
	{
		"id": 4322525,
		"name": "Vale Verde",
		"stateCode": "RS"
	},
	{
		"id": 4322558,
		"name": "Vanini",
		"stateCode": "RS"
	},
	{
		"id": 4322608,
		"name": "Venâncio Aires",
		"stateCode": "RS"
	},
	{
		"id": 4322707,
		"name": "Vera Cruz",
		"stateCode": "RS"
	},
	{
		"id": 4322806,
		"name": "Veranópolis",
		"stateCode": "RS"
	},
	{
		"id": 4322855,
		"name": "Vespasiano Corrêa",
		"stateCode": "RS"
	},
	{
		"id": 4322905,
		"name": "Viadutos",
		"stateCode": "RS"
	},
	{
		"id": 4323002,
		"name": "Viamão",
		"stateCode": "RS"
	},
	{
		"id": 4323101,
		"name": "Vicente Dutra",
		"stateCode": "RS"
	},
	{
		"id": 4323200,
		"name": "Victor Graeff",
		"stateCode": "RS"
	},
	{
		"id": 4323309,
		"name": "Vila Flores",
		"stateCode": "RS"
	},
	{
		"id": 4323358,
		"name": "Vila Lângaro",
		"stateCode": "RS"
	},
	{
		"id": 4323408,
		"name": "Vila Maria",
		"stateCode": "RS"
	},
	{
		"id": 4323457,
		"name": "Vila Nova do Sul",
		"stateCode": "RS"
	},
	{
		"id": 4323507,
		"name": "Vista Alegre",
		"stateCode": "RS"
	},
	{
		"id": 4323606,
		"name": "Vista Alegre do Prata",
		"stateCode": "RS"
	},
	{
		"id": 4323705,
		"name": "Vista Gaúcha",
		"stateCode": "RS"
	},
	{
		"id": 4323754,
		"name": "Vitória das Missões",
		"stateCode": "RS"
	},
	{
		"id": 4323770,
		"name": "Westfália",
		"stateCode": "RS"
	},
	{
		"id": 4323804,
		"name": "Xangri-lá",
		"stateCode": "RS"
	},
	{
		"id": 4200051,
		"name": "Abdon Batista",
		"stateCode": "SC"
	},
	{
		"id": 4200101,
		"name": "Abelardo Luz",
		"stateCode": "SC"
	},
	{
		"id": 4200200,
		"name": "Agrolândia",
		"stateCode": "SC"
	},
	{
		"id": 4200309,
		"name": "Agronômica",
		"stateCode": "SC"
	},
	{
		"id": 4200408,
		"name": "Água Doce",
		"stateCode": "SC"
	},
	{
		"id": 4200507,
		"name": "Águas de Chapecó",
		"stateCode": "SC"
	},
	{
		"id": 4200556,
		"name": "Águas Frias",
		"stateCode": "SC"
	},
	{
		"id": 4200606,
		"name": "Águas Mornas",
		"stateCode": "SC"
	},
	{
		"id": 4200705,
		"name": "Alfredo Wagner",
		"stateCode": "SC"
	},
	{
		"id": 4200754,
		"name": "Alto Bela Vista",
		"stateCode": "SC"
	},
	{
		"id": 4200804,
		"name": "Anchieta",
		"stateCode": "SC"
	},
	{
		"id": 4200903,
		"name": "Angelina",
		"stateCode": "SC"
	},
	{
		"id": 4201000,
		"name": "Anita Garibaldi",
		"stateCode": "SC"
	},
	{
		"id": 4201109,
		"name": "Anitápolis",
		"stateCode": "SC"
	},
	{
		"id": 4201208,
		"name": "Antônio Carlos",
		"stateCode": "SC"
	},
	{
		"id": 4201257,
		"name": "Apiúna",
		"stateCode": "SC"
	},
	{
		"id": 4201273,
		"name": "Arabutã",
		"stateCode": "SC"
	},
	{
		"id": 4201307,
		"name": "Araquari",
		"stateCode": "SC"
	},
	{
		"id": 4201406,
		"name": "Araranguá",
		"stateCode": "SC"
	},
	{
		"id": 4201505,
		"name": "Armazém",
		"stateCode": "SC"
	},
	{
		"id": 4201604,
		"name": "Arroio Trinta",
		"stateCode": "SC"
	},
	{
		"id": 4201653,
		"name": "Arvoredo",
		"stateCode": "SC"
	},
	{
		"id": 4201703,
		"name": "Ascurra",
		"stateCode": "SC"
	},
	{
		"id": 4201802,
		"name": "Atalanta",
		"stateCode": "SC"
	},
	{
		"id": 4201901,
		"name": "Aurora",
		"stateCode": "SC"
	},
	{
		"id": 4201950,
		"name": "Balneário Arroio do Silva",
		"stateCode": "SC"
	},
	{
		"id": 4202057,
		"name": "Balneário Barra do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4202008,
		"name": "Balneário Camboriú",
		"stateCode": "SC"
	},
	{
		"id": 4202073,
		"name": "Balneário Gaivota",
		"stateCode": "SC"
	},
	{
		"id": 4212809,
		"name": "Balneário Piçarras",
		"stateCode": "SC"
	},
	{
		"id": 4220000,
		"name": "Balneário Rincão",
		"stateCode": "SC"
	},
	{
		"id": 4202081,
		"name": "Bandeirante",
		"stateCode": "SC"
	},
	{
		"id": 4202099,
		"name": "Barra Bonita",
		"stateCode": "SC"
	},
	{
		"id": 4202107,
		"name": "Barra Velha",
		"stateCode": "SC"
	},
	{
		"id": 4202131,
		"name": "Bela Vista do Toldo",
		"stateCode": "SC"
	},
	{
		"id": 4202156,
		"name": "Belmonte",
		"stateCode": "SC"
	},
	{
		"id": 4202206,
		"name": "Benedito Novo",
		"stateCode": "SC"
	},
	{
		"id": 4202305,
		"name": "Biguaçu",
		"stateCode": "SC"
	},
	{
		"id": 4202404,
		"name": "Blumenau",
		"stateCode": "SC"
	},
	{
		"id": 4202438,
		"name": "Bocaina do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4202503,
		"name": "Bom Jardim da Serra",
		"stateCode": "SC"
	},
	{
		"id": 4202537,
		"name": "Bom Jesus",
		"stateCode": "SC"
	},
	{
		"id": 4202578,
		"name": "Bom Jesus do Oeste",
		"stateCode": "SC"
	},
	{
		"id": 4202602,
		"name": "Bom Retiro",
		"stateCode": "SC"
	},
	{
		"id": 4202453,
		"name": "Bombinhas",
		"stateCode": "SC"
	},
	{
		"id": 4202701,
		"name": "Botuverá",
		"stateCode": "SC"
	},
	{
		"id": 4202800,
		"name": "Braço do Norte",
		"stateCode": "SC"
	},
	{
		"id": 4202859,
		"name": "Braço do Trombudo",
		"stateCode": "SC"
	},
	{
		"id": 4202875,
		"name": "Brunópolis",
		"stateCode": "SC"
	},
	{
		"id": 4202909,
		"name": "Brusque",
		"stateCode": "SC"
	},
	{
		"id": 4203006,
		"name": "Caçador",
		"stateCode": "SC"
	},
	{
		"id": 4203105,
		"name": "Caibi",
		"stateCode": "SC"
	},
	{
		"id": 4203154,
		"name": "Calmon",
		"stateCode": "SC"
	},
	{
		"id": 4203204,
		"name": "Camboriú",
		"stateCode": "SC"
	},
	{
		"id": 4203303,
		"name": "Campo Alegre",
		"stateCode": "SC"
	},
	{
		"id": 4203402,
		"name": "Campo Belo do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4203501,
		"name": "Campo Erê",
		"stateCode": "SC"
	},
	{
		"id": 4203600,
		"name": "Campos Novos",
		"stateCode": "SC"
	},
	{
		"id": 4203709,
		"name": "Canelinha",
		"stateCode": "SC"
	},
	{
		"id": 4203808,
		"name": "Canoinhas",
		"stateCode": "SC"
	},
	{
		"id": 4203253,
		"name": "Capão Alto",
		"stateCode": "SC"
	},
	{
		"id": 4203907,
		"name": "Capinzal",
		"stateCode": "SC"
	},
	{
		"id": 4203956,
		"name": "Capivari de Baixo",
		"stateCode": "SC"
	},
	{
		"id": 4204004,
		"name": "Catanduvas",
		"stateCode": "SC"
	},
	{
		"id": 4204103,
		"name": "Caxambu do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4204152,
		"name": "Celso Ramos",
		"stateCode": "SC"
	},
	{
		"id": 4204178,
		"name": "Cerro Negro",
		"stateCode": "SC"
	},
	{
		"id": 4204194,
		"name": "Chapadão do Lageado",
		"stateCode": "SC"
	},
	{
		"id": 4204202,
		"name": "Chapecó",
		"stateCode": "SC"
	},
	{
		"id": 4204251,
		"name": "Cocal do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4204301,
		"name": "Concórdia",
		"stateCode": "SC"
	},
	{
		"id": 4204350,
		"name": "Cordilheira Alta",
		"stateCode": "SC"
	},
	{
		"id": 4204400,
		"name": "Coronel Freitas",
		"stateCode": "SC"
	},
	{
		"id": 4204459,
		"name": "Coronel Martins",
		"stateCode": "SC"
	},
	{
		"id": 4204558,
		"name": "Correia Pinto",
		"stateCode": "SC"
	},
	{
		"id": 4204509,
		"name": "Corupá",
		"stateCode": "SC"
	},
	{
		"id": 4204608,
		"name": "Criciúma",
		"stateCode": "SC"
	},
	{
		"id": 4204707,
		"name": "Cunha Porã",
		"stateCode": "SC"
	},
	{
		"id": 4204756,
		"name": "Cunhataí",
		"stateCode": "SC"
	},
	{
		"id": 4204806,
		"name": "Curitibanos",
		"stateCode": "SC"
	},
	{
		"id": 4204905,
		"name": "Descanso",
		"stateCode": "SC"
	},
	{
		"id": 4205001,
		"name": "Dionísio Cerqueira",
		"stateCode": "SC"
	},
	{
		"id": 4205100,
		"name": "Dona Emma",
		"stateCode": "SC"
	},
	{
		"id": 4205159,
		"name": "Doutor Pedrinho",
		"stateCode": "SC"
	},
	{
		"id": 4205175,
		"name": "Entre Rios",
		"stateCode": "SC"
	},
	{
		"id": 4205191,
		"name": "Ermo",
		"stateCode": "SC"
	},
	{
		"id": 4205209,
		"name": "Erval Velho",
		"stateCode": "SC"
	},
	{
		"id": 4205308,
		"name": "Faxinal dos Guedes",
		"stateCode": "SC"
	},
	{
		"id": 4205357,
		"name": "Flor do Sertão",
		"stateCode": "SC"
	},
	{
		"id": 4205407,
		"name": "Florianópolis",
		"stateCode": "SC"
	},
	{
		"id": 4205431,
		"name": "Formosa do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4205456,
		"name": "Forquilhinha",
		"stateCode": "SC"
	},
	{
		"id": 4205506,
		"name": "Fraiburgo",
		"stateCode": "SC"
	},
	{
		"id": 4205555,
		"name": "Frei Rogério",
		"stateCode": "SC"
	},
	{
		"id": 4205605,
		"name": "Galvão",
		"stateCode": "SC"
	},
	{
		"id": 4205704,
		"name": "Garopaba",
		"stateCode": "SC"
	},
	{
		"id": 4205803,
		"name": "Garuva",
		"stateCode": "SC"
	},
	{
		"id": 4205902,
		"name": "Gaspar",
		"stateCode": "SC"
	},
	{
		"id": 4206009,
		"name": "Governador Celso Ramos",
		"stateCode": "SC"
	},
	{
		"id": 4206108,
		"name": "Grão-Pará",
		"stateCode": "SC"
	},
	{
		"id": 4206207,
		"name": "Gravatal",
		"stateCode": "SC"
	},
	{
		"id": 4206306,
		"name": "Guabiruba",
		"stateCode": "SC"
	},
	{
		"id": 4206405,
		"name": "Guaraciaba",
		"stateCode": "SC"
	},
	{
		"id": 4206504,
		"name": "Guaramirim",
		"stateCode": "SC"
	},
	{
		"id": 4206603,
		"name": "Guarujá do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4206652,
		"name": "Guatambú",
		"stateCode": "SC"
	},
	{
		"id": 4206702,
		"name": "Herval d'Oeste",
		"stateCode": "SC"
	},
	{
		"id": 4206751,
		"name": "Ibiam",
		"stateCode": "SC"
	},
	{
		"id": 4206801,
		"name": "Ibicaré",
		"stateCode": "SC"
	},
	{
		"id": 4206900,
		"name": "Ibirama",
		"stateCode": "SC"
	},
	{
		"id": 4207007,
		"name": "Içara",
		"stateCode": "SC"
	},
	{
		"id": 4207106,
		"name": "Ilhota",
		"stateCode": "SC"
	},
	{
		"id": 4207205,
		"name": "Imaruí",
		"stateCode": "SC"
	},
	{
		"id": 4207304,
		"name": "Imbituba",
		"stateCode": "SC"
	},
	{
		"id": 4207403,
		"name": "Imbuia",
		"stateCode": "SC"
	},
	{
		"id": 4207502,
		"name": "Indaial",
		"stateCode": "SC"
	},
	{
		"id": 4207577,
		"name": "Iomerê",
		"stateCode": "SC"
	},
	{
		"id": 4207601,
		"name": "Ipira",
		"stateCode": "SC"
	},
	{
		"id": 4207650,
		"name": "Iporã do Oeste",
		"stateCode": "SC"
	},
	{
		"id": 4207684,
		"name": "Ipuaçu",
		"stateCode": "SC"
	},
	{
		"id": 4207700,
		"name": "Ipumirim",
		"stateCode": "SC"
	},
	{
		"id": 4207759,
		"name": "Iraceminha",
		"stateCode": "SC"
	},
	{
		"id": 4207809,
		"name": "Irani",
		"stateCode": "SC"
	},
	{
		"id": 4207858,
		"name": "Irati",
		"stateCode": "SC"
	},
	{
		"id": 4207908,
		"name": "Irineópolis",
		"stateCode": "SC"
	},
	{
		"id": 4208005,
		"name": "Itá",
		"stateCode": "SC"
	},
	{
		"id": 4208104,
		"name": "Itaiópolis",
		"stateCode": "SC"
	},
	{
		"id": 4208203,
		"name": "Itajaí",
		"stateCode": "SC"
	},
	{
		"id": 4208302,
		"name": "Itapema",
		"stateCode": "SC"
	},
	{
		"id": 4208401,
		"name": "Itapiranga",
		"stateCode": "SC"
	},
	{
		"id": 4208450,
		"name": "Itapoá",
		"stateCode": "SC"
	},
	{
		"id": 4208500,
		"name": "Ituporanga",
		"stateCode": "SC"
	},
	{
		"id": 4208609,
		"name": "Jaborá",
		"stateCode": "SC"
	},
	{
		"id": 4208708,
		"name": "Jacinto Machado",
		"stateCode": "SC"
	},
	{
		"id": 4208807,
		"name": "Jaguaruna",
		"stateCode": "SC"
	},
	{
		"id": 4208906,
		"name": "Jaraguá do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4208955,
		"name": "Jardinópolis",
		"stateCode": "SC"
	},
	{
		"id": 4209003,
		"name": "Joaçaba",
		"stateCode": "SC"
	},
	{
		"id": 4209102,
		"name": "Joinville",
		"stateCode": "SC"
	},
	{
		"id": 4209151,
		"name": "José Boiteux",
		"stateCode": "SC"
	},
	{
		"id": 4209177,
		"name": "Jupiá",
		"stateCode": "SC"
	},
	{
		"id": 4209201,
		"name": "Lacerdópolis",
		"stateCode": "SC"
	},
	{
		"id": 4209300,
		"name": "Lages",
		"stateCode": "SC"
	},
	{
		"id": 4209409,
		"name": "Laguna",
		"stateCode": "SC"
	},
	{
		"id": 4209458,
		"name": "Lajeado Grande",
		"stateCode": "SC"
	},
	{
		"id": 4209508,
		"name": "Laurentino",
		"stateCode": "SC"
	},
	{
		"id": 4209607,
		"name": "Lauro Müller",
		"stateCode": "SC"
	},
	{
		"id": 4209706,
		"name": "Lebon Régis",
		"stateCode": "SC"
	},
	{
		"id": 4209805,
		"name": "Leoberto Leal",
		"stateCode": "SC"
	},
	{
		"id": 4209854,
		"name": "Lindóia do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4209904,
		"name": "Lontras",
		"stateCode": "SC"
	},
	{
		"id": 4210001,
		"name": "Luiz Alves",
		"stateCode": "SC"
	},
	{
		"id": 4210035,
		"name": "Luzerna",
		"stateCode": "SC"
	},
	{
		"id": 4210050,
		"name": "Macieira",
		"stateCode": "SC"
	},
	{
		"id": 4210100,
		"name": "Mafra",
		"stateCode": "SC"
	},
	{
		"id": 4210209,
		"name": "Major Gercino",
		"stateCode": "SC"
	},
	{
		"id": 4210308,
		"name": "Major Vieira",
		"stateCode": "SC"
	},
	{
		"id": 4210407,
		"name": "Maracajá",
		"stateCode": "SC"
	},
	{
		"id": 4210506,
		"name": "Maravilha",
		"stateCode": "SC"
	},
	{
		"id": 4210555,
		"name": "Marema",
		"stateCode": "SC"
	},
	{
		"id": 4210605,
		"name": "Massaranduba",
		"stateCode": "SC"
	},
	{
		"id": 4210704,
		"name": "Matos Costa",
		"stateCode": "SC"
	},
	{
		"id": 4210803,
		"name": "Meleiro",
		"stateCode": "SC"
	},
	{
		"id": 4210852,
		"name": "Mirim Doce",
		"stateCode": "SC"
	},
	{
		"id": 4210902,
		"name": "Modelo",
		"stateCode": "SC"
	},
	{
		"id": 4211009,
		"name": "Mondaí",
		"stateCode": "SC"
	},
	{
		"id": 4211058,
		"name": "Monte Carlo",
		"stateCode": "SC"
	},
	{
		"id": 4211108,
		"name": "Monte Castelo",
		"stateCode": "SC"
	},
	{
		"id": 4211207,
		"name": "Morro da Fumaça",
		"stateCode": "SC"
	},
	{
		"id": 4211256,
		"name": "Morro Grande",
		"stateCode": "SC"
	},
	{
		"id": 4211306,
		"name": "Navegantes",
		"stateCode": "SC"
	},
	{
		"id": 4211405,
		"name": "Nova Erechim",
		"stateCode": "SC"
	},
	{
		"id": 4211454,
		"name": "Nova Itaberaba",
		"stateCode": "SC"
	},
	{
		"id": 4211504,
		"name": "Nova Trento",
		"stateCode": "SC"
	},
	{
		"id": 4211603,
		"name": "Nova Veneza",
		"stateCode": "SC"
	},
	{
		"id": 4211652,
		"name": "Novo Horizonte",
		"stateCode": "SC"
	},
	{
		"id": 4211702,
		"name": "Orleans",
		"stateCode": "SC"
	},
	{
		"id": 4211751,
		"name": "Otacílio Costa",
		"stateCode": "SC"
	},
	{
		"id": 4211801,
		"name": "Ouro",
		"stateCode": "SC"
	},
	{
		"id": 4211850,
		"name": "Ouro Verde",
		"stateCode": "SC"
	},
	{
		"id": 4211876,
		"name": "Paial",
		"stateCode": "SC"
	},
	{
		"id": 4211892,
		"name": "Painel",
		"stateCode": "SC"
	},
	{
		"id": 4211900,
		"name": "Palhoça",
		"stateCode": "SC"
	},
	{
		"id": 4212007,
		"name": "Palma Sola",
		"stateCode": "SC"
	},
	{
		"id": 4212056,
		"name": "Palmeira",
		"stateCode": "SC"
	},
	{
		"id": 4212106,
		"name": "Palmitos",
		"stateCode": "SC"
	},
	{
		"id": 4212205,
		"name": "Papanduva",
		"stateCode": "SC"
	},
	{
		"id": 4212239,
		"name": "Paraíso",
		"stateCode": "SC"
	},
	{
		"id": 4212254,
		"name": "Passo de Torres",
		"stateCode": "SC"
	},
	{
		"id": 4212270,
		"name": "Passos Maia",
		"stateCode": "SC"
	},
	{
		"id": 4212304,
		"name": "Paulo Lopes",
		"stateCode": "SC"
	},
	{
		"id": 4212403,
		"name": "Pedras Grandes",
		"stateCode": "SC"
	},
	{
		"id": 4212502,
		"name": "Penha",
		"stateCode": "SC"
	},
	{
		"id": 4212601,
		"name": "Peritiba",
		"stateCode": "SC"
	},
	{
		"id": 4212650,
		"name": "Pescaria Brava",
		"stateCode": "SC"
	},
	{
		"id": 4212700,
		"name": "Petrolândia",
		"stateCode": "SC"
	},
	{
		"id": 4212908,
		"name": "Pinhalzinho",
		"stateCode": "SC"
	},
	{
		"id": 4213005,
		"name": "Pinheiro Preto",
		"stateCode": "SC"
	},
	{
		"id": 4213104,
		"name": "Piratuba",
		"stateCode": "SC"
	},
	{
		"id": 4213153,
		"name": "Planalto Alegre",
		"stateCode": "SC"
	},
	{
		"id": 4213203,
		"name": "Pomerode",
		"stateCode": "SC"
	},
	{
		"id": 4213302,
		"name": "Ponte Alta",
		"stateCode": "SC"
	},
	{
		"id": 4213351,
		"name": "Ponte Alta do Norte",
		"stateCode": "SC"
	},
	{
		"id": 4213401,
		"name": "Ponte Serrada",
		"stateCode": "SC"
	},
	{
		"id": 4213500,
		"name": "Porto Belo",
		"stateCode": "SC"
	},
	{
		"id": 4213609,
		"name": "Porto União",
		"stateCode": "SC"
	},
	{
		"id": 4213708,
		"name": "Pouso Redondo",
		"stateCode": "SC"
	},
	{
		"id": 4213807,
		"name": "Praia Grande",
		"stateCode": "SC"
	},
	{
		"id": 4213906,
		"name": "Presidente Castello Branco",
		"stateCode": "SC"
	},
	{
		"id": 4214003,
		"name": "Presidente Getúlio",
		"stateCode": "SC"
	},
	{
		"id": 4214102,
		"name": "Presidente Nereu",
		"stateCode": "SC"
	},
	{
		"id": 4214151,
		"name": "Princesa",
		"stateCode": "SC"
	},
	{
		"id": 4214201,
		"name": "Quilombo",
		"stateCode": "SC"
	},
	{
		"id": 4214300,
		"name": "Rancho Queimado",
		"stateCode": "SC"
	},
	{
		"id": 4214409,
		"name": "Rio das Antas",
		"stateCode": "SC"
	},
	{
		"id": 4214508,
		"name": "Rio do Campo",
		"stateCode": "SC"
	},
	{
		"id": 4214607,
		"name": "Rio do Oeste",
		"stateCode": "SC"
	},
	{
		"id": 4214805,
		"name": "Rio do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4214706,
		"name": "Rio dos Cedros",
		"stateCode": "SC"
	},
	{
		"id": 4214904,
		"name": "Rio Fortuna",
		"stateCode": "SC"
	},
	{
		"id": 4215000,
		"name": "Rio Negrinho",
		"stateCode": "SC"
	},
	{
		"id": 4215059,
		"name": "Rio Rufino",
		"stateCode": "SC"
	},
	{
		"id": 4215075,
		"name": "Riqueza",
		"stateCode": "SC"
	},
	{
		"id": 4215109,
		"name": "Rodeio",
		"stateCode": "SC"
	},
	{
		"id": 4215208,
		"name": "Romelândia",
		"stateCode": "SC"
	},
	{
		"id": 4215307,
		"name": "Salete",
		"stateCode": "SC"
	},
	{
		"id": 4215356,
		"name": "Saltinho",
		"stateCode": "SC"
	},
	{
		"id": 4215406,
		"name": "Salto Veloso",
		"stateCode": "SC"
	},
	{
		"id": 4215455,
		"name": "Sangão",
		"stateCode": "SC"
	},
	{
		"id": 4215505,
		"name": "Santa Cecília",
		"stateCode": "SC"
	},
	{
		"id": 4215554,
		"name": "Santa Helena",
		"stateCode": "SC"
	},
	{
		"id": 4215604,
		"name": "Santa Rosa de Lima",
		"stateCode": "SC"
	},
	{
		"id": 4215653,
		"name": "Santa Rosa do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4215679,
		"name": "Santa Terezinha",
		"stateCode": "SC"
	},
	{
		"id": 4215687,
		"name": "Santa Terezinha do Progresso",
		"stateCode": "SC"
	},
	{
		"id": 4215695,
		"name": "Santiago do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4215703,
		"name": "Santo Amaro da Imperatriz",
		"stateCode": "SC"
	},
	{
		"id": 4215802,
		"name": "São Bento do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4215752,
		"name": "São Bernardino",
		"stateCode": "SC"
	},
	{
		"id": 4215901,
		"name": "São Bonifácio",
		"stateCode": "SC"
	},
	{
		"id": 4216008,
		"name": "São Carlos",
		"stateCode": "SC"
	},
	{
		"id": 4216057,
		"name": "São Cristóvão do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4216107,
		"name": "São Domingos",
		"stateCode": "SC"
	},
	{
		"id": 4216206,
		"name": "São Francisco do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4216305,
		"name": "São João Batista",
		"stateCode": "SC"
	},
	{
		"id": 4216354,
		"name": "São João do Itaperiú",
		"stateCode": "SC"
	},
	{
		"id": 4216255,
		"name": "São João do Oeste",
		"stateCode": "SC"
	},
	{
		"id": 4216404,
		"name": "São João do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4216503,
		"name": "São Joaquim",
		"stateCode": "SC"
	},
	{
		"id": 4216602,
		"name": "São José",
		"stateCode": "SC"
	},
	{
		"id": 4216701,
		"name": "São José do Cedro",
		"stateCode": "SC"
	},
	{
		"id": 4216800,
		"name": "São José do Cerrito",
		"stateCode": "SC"
	},
	{
		"id": 4216909,
		"name": "São Lourenço do Oeste",
		"stateCode": "SC"
	},
	{
		"id": 4217006,
		"name": "São Ludgero",
		"stateCode": "SC"
	},
	{
		"id": 4217105,
		"name": "São Martinho",
		"stateCode": "SC"
	},
	{
		"id": 4217154,
		"name": "São Miguel da Boa Vista",
		"stateCode": "SC"
	},
	{
		"id": 4217204,
		"name": "São Miguel do Oeste",
		"stateCode": "SC"
	},
	{
		"id": 4217253,
		"name": "São Pedro de Alcântara",
		"stateCode": "SC"
	},
	{
		"id": 4217303,
		"name": "Saudades",
		"stateCode": "SC"
	},
	{
		"id": 4217402,
		"name": "Schroeder",
		"stateCode": "SC"
	},
	{
		"id": 4217501,
		"name": "Seara",
		"stateCode": "SC"
	},
	{
		"id": 4217550,
		"name": "Serra Alta",
		"stateCode": "SC"
	},
	{
		"id": 4217600,
		"name": "Siderópolis",
		"stateCode": "SC"
	},
	{
		"id": 4217709,
		"name": "Sombrio",
		"stateCode": "SC"
	},
	{
		"id": 4217758,
		"name": "Sul Brasil",
		"stateCode": "SC"
	},
	{
		"id": 4217808,
		"name": "Taió",
		"stateCode": "SC"
	},
	{
		"id": 4217907,
		"name": "Tangará",
		"stateCode": "SC"
	},
	{
		"id": 4217956,
		"name": "Tigrinhos",
		"stateCode": "SC"
	},
	{
		"id": 4218004,
		"name": "Tijucas",
		"stateCode": "SC"
	},
	{
		"id": 4218103,
		"name": "Timbé do Sul",
		"stateCode": "SC"
	},
	{
		"id": 4218202,
		"name": "Timbó",
		"stateCode": "SC"
	},
	{
		"id": 4218251,
		"name": "Timbó Grande",
		"stateCode": "SC"
	},
	{
		"id": 4218301,
		"name": "Três Barras",
		"stateCode": "SC"
	},
	{
		"id": 4218350,
		"name": "Treviso",
		"stateCode": "SC"
	},
	{
		"id": 4218400,
		"name": "Treze de Maio",
		"stateCode": "SC"
	},
	{
		"id": 4218509,
		"name": "Treze Tílias",
		"stateCode": "SC"
	},
	{
		"id": 4218608,
		"name": "Trombudo Central",
		"stateCode": "SC"
	},
	{
		"id": 4218707,
		"name": "Tubarão",
		"stateCode": "SC"
	},
	{
		"id": 4218756,
		"name": "Tunápolis",
		"stateCode": "SC"
	},
	{
		"id": 4218806,
		"name": "Turvo",
		"stateCode": "SC"
	},
	{
		"id": 4218855,
		"name": "União do Oeste",
		"stateCode": "SC"
	},
	{
		"id": 4218905,
		"name": "Urubici",
		"stateCode": "SC"
	},
	{
		"id": 4218954,
		"name": "Urupema",
		"stateCode": "SC"
	},
	{
		"id": 4219002,
		"name": "Urussanga",
		"stateCode": "SC"
	},
	{
		"id": 4219101,
		"name": "Vargeão",
		"stateCode": "SC"
	},
	{
		"id": 4219150,
		"name": "Vargem",
		"stateCode": "SC"
	},
	{
		"id": 4219176,
		"name": "Vargem Bonita",
		"stateCode": "SC"
	},
	{
		"id": 4219200,
		"name": "Vidal Ramos",
		"stateCode": "SC"
	},
	{
		"id": 4219309,
		"name": "Videira",
		"stateCode": "SC"
	},
	{
		"id": 4219358,
		"name": "Vitor Meireles",
		"stateCode": "SC"
	},
	{
		"id": 4219408,
		"name": "Witmarsum",
		"stateCode": "SC"
	},
	{
		"id": 4219507,
		"name": "Xanxerê",
		"stateCode": "SC"
	},
	{
		"id": 4219606,
		"name": "Xavantina",
		"stateCode": "SC"
	},
	{
		"id": 4219705,
		"name": "Xaxim",
		"stateCode": "SC"
	},
	{
		"id": 4219853,
		"name": "Zortéa",
		"stateCode": "SC"
	},
	{
		"id": 2800100,
		"name": "Amparo do São Francisco",
		"stateCode": "SE"
	},
	{
		"id": 2800209,
		"name": "Aquidabã",
		"stateCode": "SE"
	},
	{
		"id": 2800308,
		"name": "Aracaju",
		"stateCode": "SE"
	},
	{
		"id": 2800407,
		"name": "Arauá",
		"stateCode": "SE"
	},
	{
		"id": 2800506,
		"name": "Areia Branca",
		"stateCode": "SE"
	},
	{
		"id": 2800605,
		"name": "Barra dos Coqueiros",
		"stateCode": "SE"
	},
	{
		"id": 2800670,
		"name": "Boquim",
		"stateCode": "SE"
	},
	{
		"id": 2800704,
		"name": "Brejo Grande",
		"stateCode": "SE"
	},
	{
		"id": 2801009,
		"name": "Campo do Brito",
		"stateCode": "SE"
	},
	{
		"id": 2801108,
		"name": "Canhoba",
		"stateCode": "SE"
	},
	{
		"id": 2801207,
		"name": "Canindé de São Francisco",
		"stateCode": "SE"
	},
	{
		"id": 2801306,
		"name": "Capela",
		"stateCode": "SE"
	},
	{
		"id": 2801405,
		"name": "Carira",
		"stateCode": "SE"
	},
	{
		"id": 2801504,
		"name": "Carmópolis",
		"stateCode": "SE"
	},
	{
		"id": 2801603,
		"name": "Cedro de São João",
		"stateCode": "SE"
	},
	{
		"id": 2801702,
		"name": "Cristinápolis",
		"stateCode": "SE"
	},
	{
		"id": 2801900,
		"name": "Cumbe",
		"stateCode": "SE"
	},
	{
		"id": 2802007,
		"name": "Divina Pastora",
		"stateCode": "SE"
	},
	{
		"id": 2802106,
		"name": "Estância",
		"stateCode": "SE"
	},
	{
		"id": 2802205,
		"name": "Feira Nova",
		"stateCode": "SE"
	},
	{
		"id": 2802304,
		"name": "Frei Paulo",
		"stateCode": "SE"
	},
	{
		"id": 2802403,
		"name": "Gararu",
		"stateCode": "SE"
	},
	{
		"id": 2802502,
		"name": "General Maynard",
		"stateCode": "SE"
	},
	{
		"id": 2802601,
		"name": "Graccho Cardoso",
		"stateCode": "SE"
	},
	{
		"id": 2802700,
		"name": "Ilha das Flores",
		"stateCode": "SE"
	},
	{
		"id": 2802809,
		"name": "Indiaroba",
		"stateCode": "SE"
	},
	{
		"id": 2802908,
		"name": "Itabaiana",
		"stateCode": "SE"
	},
	{
		"id": 2803005,
		"name": "Itabaianinha",
		"stateCode": "SE"
	},
	{
		"id": 2803104,
		"name": "Itabi",
		"stateCode": "SE"
	},
	{
		"id": 2803203,
		"name": "Itaporanga d'Ajuda",
		"stateCode": "SE"
	},
	{
		"id": 2803302,
		"name": "Japaratuba",
		"stateCode": "SE"
	},
	{
		"id": 2803401,
		"name": "Japoatã",
		"stateCode": "SE"
	},
	{
		"id": 2803500,
		"name": "Lagarto",
		"stateCode": "SE"
	},
	{
		"id": 2803609,
		"name": "Laranjeiras",
		"stateCode": "SE"
	},
	{
		"id": 2803708,
		"name": "Macambira",
		"stateCode": "SE"
	},
	{
		"id": 2803807,
		"name": "Malhada dos Bois",
		"stateCode": "SE"
	},
	{
		"id": 2803906,
		"name": "Malhador",
		"stateCode": "SE"
	},
	{
		"id": 2804003,
		"name": "Maruim",
		"stateCode": "SE"
	},
	{
		"id": 2804102,
		"name": "Moita Bonita",
		"stateCode": "SE"
	},
	{
		"id": 2804201,
		"name": "Monte Alegre de Sergipe",
		"stateCode": "SE"
	},
	{
		"id": 2804300,
		"name": "Muribeca",
		"stateCode": "SE"
	},
	{
		"id": 2804409,
		"name": "Neópolis",
		"stateCode": "SE"
	},
	{
		"id": 2804458,
		"name": "Nossa Senhora Aparecida",
		"stateCode": "SE"
	},
	{
		"id": 2804508,
		"name": "Nossa Senhora da Glória",
		"stateCode": "SE"
	},
	{
		"id": 2804607,
		"name": "Nossa Senhora das Dores",
		"stateCode": "SE"
	},
	{
		"id": 2804706,
		"name": "Nossa Senhora de Lourdes",
		"stateCode": "SE"
	},
	{
		"id": 2804805,
		"name": "Nossa Senhora do Socorro",
		"stateCode": "SE"
	},
	{
		"id": 2804904,
		"name": "Pacatuba",
		"stateCode": "SE"
	},
	{
		"id": 2805000,
		"name": "Pedra Mole",
		"stateCode": "SE"
	},
	{
		"id": 2805109,
		"name": "Pedrinhas",
		"stateCode": "SE"
	},
	{
		"id": 2805208,
		"name": "Pinhão",
		"stateCode": "SE"
	},
	{
		"id": 2805307,
		"name": "Pirambu",
		"stateCode": "SE"
	},
	{
		"id": 2805406,
		"name": "Poço Redondo",
		"stateCode": "SE"
	},
	{
		"id": 2805505,
		"name": "Poço Verde",
		"stateCode": "SE"
	},
	{
		"id": 2805604,
		"name": "Porto da Folha",
		"stateCode": "SE"
	},
	{
		"id": 2805703,
		"name": "Propriá",
		"stateCode": "SE"
	},
	{
		"id": 2805802,
		"name": "Riachão do Dantas",
		"stateCode": "SE"
	},
	{
		"id": 2805901,
		"name": "Riachuelo",
		"stateCode": "SE"
	},
	{
		"id": 2806008,
		"name": "Ribeirópolis",
		"stateCode": "SE"
	},
	{
		"id": 2806107,
		"name": "Rosário do Catete",
		"stateCode": "SE"
	},
	{
		"id": 2806206,
		"name": "Salgado",
		"stateCode": "SE"
	},
	{
		"id": 2806305,
		"name": "Santa Luzia do Itanhy",
		"stateCode": "SE"
	},
	{
		"id": 2806503,
		"name": "Santa Rosa de Lima",
		"stateCode": "SE"
	},
	{
		"id": 2806404,
		"name": "Santana do São Francisco",
		"stateCode": "SE"
	},
	{
		"id": 2806602,
		"name": "Santo Amaro das Brotas",
		"stateCode": "SE"
	},
	{
		"id": 2806701,
		"name": "São Cristóvão",
		"stateCode": "SE"
	},
	{
		"id": 2806800,
		"name": "São Domingos",
		"stateCode": "SE"
	},
	{
		"id": 2806909,
		"name": "São Francisco",
		"stateCode": "SE"
	},
	{
		"id": 2807006,
		"name": "São Miguel do Aleixo",
		"stateCode": "SE"
	},
	{
		"id": 2807105,
		"name": "Simão Dias",
		"stateCode": "SE"
	},
	{
		"id": 2807204,
		"name": "Siriri",
		"stateCode": "SE"
	},
	{
		"id": 2807303,
		"name": "Telha",
		"stateCode": "SE"
	},
	{
		"id": 2807402,
		"name": "Tobias Barreto",
		"stateCode": "SE"
	},
	{
		"id": 2807501,
		"name": "Tomar do Geru",
		"stateCode": "SE"
	},
	{
		"id": 2807600,
		"name": "Umbaúba",
		"stateCode": "SE"
	},
	{
		"id": 3500105,
		"name": "Adamantina",
		"stateCode": "SP"
	},
	{
		"id": 3500204,
		"name": "Adolfo",
		"stateCode": "SP"
	},
	{
		"id": 3500303,
		"name": "Aguaí",
		"stateCode": "SP"
	},
	{
		"id": 3500402,
		"name": "Águas da Prata",
		"stateCode": "SP"
	},
	{
		"id": 3500501,
		"name": "Águas de Lindóia",
		"stateCode": "SP"
	},
	{
		"id": 3500550,
		"name": "Águas de Santa Bárbara",
		"stateCode": "SP"
	},
	{
		"id": 3500600,
		"name": "Águas de São Pedro",
		"stateCode": "SP"
	},
	{
		"id": 3500709,
		"name": "Agudos",
		"stateCode": "SP"
	},
	{
		"id": 3500758,
		"name": "Alambari",
		"stateCode": "SP"
	},
	{
		"id": 3500808,
		"name": "Alfredo Marcondes",
		"stateCode": "SP"
	},
	{
		"id": 3500907,
		"name": "Altair",
		"stateCode": "SP"
	},
	{
		"id": 3501004,
		"name": "Altinópolis",
		"stateCode": "SP"
	},
	{
		"id": 3501103,
		"name": "Alto Alegre",
		"stateCode": "SP"
	},
	{
		"id": 3501152,
		"name": "Alumínio",
		"stateCode": "SP"
	},
	{
		"id": 3501202,
		"name": "Álvares Florence",
		"stateCode": "SP"
	},
	{
		"id": 3501301,
		"name": "Álvares Machado",
		"stateCode": "SP"
	},
	{
		"id": 3501400,
		"name": "Álvaro de Carvalho",
		"stateCode": "SP"
	},
	{
		"id": 3501509,
		"name": "Alvinlândia",
		"stateCode": "SP"
	},
	{
		"id": 3501608,
		"name": "Americana",
		"stateCode": "SP"
	},
	{
		"id": 3501707,
		"name": "Américo Brasiliense",
		"stateCode": "SP"
	},
	{
		"id": 3501806,
		"name": "Américo de Campos",
		"stateCode": "SP"
	},
	{
		"id": 3501905,
		"name": "Amparo",
		"stateCode": "SP"
	},
	{
		"id": 3502002,
		"name": "Analândia",
		"stateCode": "SP"
	},
	{
		"id": 3502101,
		"name": "Andradina",
		"stateCode": "SP"
	},
	{
		"id": 3502200,
		"name": "Angatuba",
		"stateCode": "SP"
	},
	{
		"id": 3502309,
		"name": "Anhembi",
		"stateCode": "SP"
	},
	{
		"id": 3502408,
		"name": "Anhumas",
		"stateCode": "SP"
	},
	{
		"id": 3502507,
		"name": "Aparecida",
		"stateCode": "SP"
	},
	{
		"id": 3502606,
		"name": "Aparecida d'Oeste",
		"stateCode": "SP"
	},
	{
		"id": 3502705,
		"name": "Apiaí",
		"stateCode": "SP"
	},
	{
		"id": 3502754,
		"name": "Araçariguama",
		"stateCode": "SP"
	},
	{
		"id": 3502804,
		"name": "Araçatuba",
		"stateCode": "SP"
	},
	{
		"id": 3502903,
		"name": "Araçoiaba da Serra",
		"stateCode": "SP"
	},
	{
		"id": 3503000,
		"name": "Aramina",
		"stateCode": "SP"
	},
	{
		"id": 3503109,
		"name": "Arandu",
		"stateCode": "SP"
	},
	{
		"id": 3503158,
		"name": "Arapeí",
		"stateCode": "SP"
	},
	{
		"id": 3503208,
		"name": "Araraquara",
		"stateCode": "SP"
	},
	{
		"id": 3503307,
		"name": "Araras",
		"stateCode": "SP"
	},
	{
		"id": 3503356,
		"name": "Arco-Íris",
		"stateCode": "SP"
	},
	{
		"id": 3503406,
		"name": "Arealva",
		"stateCode": "SP"
	},
	{
		"id": 3503505,
		"name": "Areias",
		"stateCode": "SP"
	},
	{
		"id": 3503604,
		"name": "Areiópolis",
		"stateCode": "SP"
	},
	{
		"id": 3503703,
		"name": "Ariranha",
		"stateCode": "SP"
	},
	{
		"id": 3503802,
		"name": "Artur Nogueira",
		"stateCode": "SP"
	},
	{
		"id": 3503901,
		"name": "Arujá",
		"stateCode": "SP"
	},
	{
		"id": 3503950,
		"name": "Aspásia",
		"stateCode": "SP"
	},
	{
		"id": 3504008,
		"name": "Assis",
		"stateCode": "SP"
	},
	{
		"id": 3504107,
		"name": "Atibaia",
		"stateCode": "SP"
	},
	{
		"id": 3504206,
		"name": "Auriflama",
		"stateCode": "SP"
	},
	{
		"id": 3504305,
		"name": "Avaí",
		"stateCode": "SP"
	},
	{
		"id": 3504404,
		"name": "Avanhandava",
		"stateCode": "SP"
	},
	{
		"id": 3504503,
		"name": "Avaré",
		"stateCode": "SP"
	},
	{
		"id": 3504602,
		"name": "Bady Bassitt",
		"stateCode": "SP"
	},
	{
		"id": 3504701,
		"name": "Balbinos",
		"stateCode": "SP"
	},
	{
		"id": 3504800,
		"name": "Bálsamo",
		"stateCode": "SP"
	},
	{
		"id": 3504909,
		"name": "Bananal",
		"stateCode": "SP"
	},
	{
		"id": 3505005,
		"name": "Barão de Antonina",
		"stateCode": "SP"
	},
	{
		"id": 3505104,
		"name": "Barbosa",
		"stateCode": "SP"
	},
	{
		"id": 3505203,
		"name": "Bariri",
		"stateCode": "SP"
	},
	{
		"id": 3505302,
		"name": "Barra Bonita",
		"stateCode": "SP"
	},
	{
		"id": 3505351,
		"name": "Barra do Chapéu",
		"stateCode": "SP"
	},
	{
		"id": 3505401,
		"name": "Barra do Turvo",
		"stateCode": "SP"
	},
	{
		"id": 3505500,
		"name": "Barretos",
		"stateCode": "SP"
	},
	{
		"id": 3505609,
		"name": "Barrinha",
		"stateCode": "SP"
	},
	{
		"id": 3505708,
		"name": "Barueri",
		"stateCode": "SP"
	},
	{
		"id": 3505807,
		"name": "Bastos",
		"stateCode": "SP"
	},
	{
		"id": 3505906,
		"name": "Batatais",
		"stateCode": "SP"
	},
	{
		"id": 3506003,
		"name": "Bauru",
		"stateCode": "SP"
	},
	{
		"id": 3506102,
		"name": "Bebedouro",
		"stateCode": "SP"
	},
	{
		"id": 3506201,
		"name": "Bento de Abreu",
		"stateCode": "SP"
	},
	{
		"id": 3506300,
		"name": "Bernardino de Campos",
		"stateCode": "SP"
	},
	{
		"id": 3506359,
		"name": "Bertioga",
		"stateCode": "SP"
	},
	{
		"id": 3506409,
		"name": "Bilac",
		"stateCode": "SP"
	},
	{
		"id": 3506508,
		"name": "Birigui",
		"stateCode": "SP"
	},
	{
		"id": 3506607,
		"name": "Biritiba Mirim",
		"stateCode": "SP"
	},
	{
		"id": 3506706,
		"name": "Boa Esperança do Sul",
		"stateCode": "SP"
	},
	{
		"id": 3506805,
		"name": "Bocaina",
		"stateCode": "SP"
	},
	{
		"id": 3506904,
		"name": "Bofete",
		"stateCode": "SP"
	},
	{
		"id": 3507001,
		"name": "Boituva",
		"stateCode": "SP"
	},
	{
		"id": 3507100,
		"name": "Bom Jesus dos Perdões",
		"stateCode": "SP"
	},
	{
		"id": 3507159,
		"name": "Bom Sucesso de Itararé",
		"stateCode": "SP"
	},
	{
		"id": 3507209,
		"name": "Borá",
		"stateCode": "SP"
	},
	{
		"id": 3507308,
		"name": "Boracéia",
		"stateCode": "SP"
	},
	{
		"id": 3507407,
		"name": "Borborema",
		"stateCode": "SP"
	},
	{
		"id": 3507456,
		"name": "Borebi",
		"stateCode": "SP"
	},
	{
		"id": 3507506,
		"name": "Botucatu",
		"stateCode": "SP"
	},
	{
		"id": 3507605,
		"name": "Bragança Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3507704,
		"name": "Braúna",
		"stateCode": "SP"
	},
	{
		"id": 3507753,
		"name": "Brejo Alegre",
		"stateCode": "SP"
	},
	{
		"id": 3507803,
		"name": "Brodowski",
		"stateCode": "SP"
	},
	{
		"id": 3507902,
		"name": "Brotas",
		"stateCode": "SP"
	},
	{
		"id": 3508009,
		"name": "Buri",
		"stateCode": "SP"
	},
	{
		"id": 3508108,
		"name": "Buritama",
		"stateCode": "SP"
	},
	{
		"id": 3508207,
		"name": "Buritizal",
		"stateCode": "SP"
	},
	{
		"id": 3508306,
		"name": "Cabrália Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3508405,
		"name": "Cabreúva",
		"stateCode": "SP"
	},
	{
		"id": 3508504,
		"name": "Caçapava",
		"stateCode": "SP"
	},
	{
		"id": 3508603,
		"name": "Cachoeira Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3508702,
		"name": "Caconde",
		"stateCode": "SP"
	},
	{
		"id": 3508801,
		"name": "Cafelândia",
		"stateCode": "SP"
	},
	{
		"id": 3508900,
		"name": "Caiabu",
		"stateCode": "SP"
	},
	{
		"id": 3509007,
		"name": "Caieiras",
		"stateCode": "SP"
	},
	{
		"id": 3509106,
		"name": "Caiuá",
		"stateCode": "SP"
	},
	{
		"id": 3509205,
		"name": "Cajamar",
		"stateCode": "SP"
	},
	{
		"id": 3509254,
		"name": "Cajati",
		"stateCode": "SP"
	},
	{
		"id": 3509304,
		"name": "Cajobi",
		"stateCode": "SP"
	},
	{
		"id": 3509403,
		"name": "Cajuru",
		"stateCode": "SP"
	},
	{
		"id": 3509452,
		"name": "Campina do Monte Alegre",
		"stateCode": "SP"
	},
	{
		"id": 3509502,
		"name": "Campinas",
		"stateCode": "SP"
	},
	{
		"id": 3509601,
		"name": "Campo Limpo Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3509700,
		"name": "Campos do Jordão",
		"stateCode": "SP"
	},
	{
		"id": 3509809,
		"name": "Campos Novos Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3509908,
		"name": "Cananéia",
		"stateCode": "SP"
	},
	{
		"id": 3509957,
		"name": "Canas",
		"stateCode": "SP"
	},
	{
		"id": 3510005,
		"name": "Cândido Mota",
		"stateCode": "SP"
	},
	{
		"id": 3510104,
		"name": "Cândido Rodrigues",
		"stateCode": "SP"
	},
	{
		"id": 3510153,
		"name": "Canitar",
		"stateCode": "SP"
	},
	{
		"id": 3510203,
		"name": "Capão Bonito",
		"stateCode": "SP"
	},
	{
		"id": 3510302,
		"name": "Capela do Alto",
		"stateCode": "SP"
	},
	{
		"id": 3510401,
		"name": "Capivari",
		"stateCode": "SP"
	},
	{
		"id": 3510500,
		"name": "Caraguatatuba",
		"stateCode": "SP"
	},
	{
		"id": 3510609,
		"name": "Carapicuíba",
		"stateCode": "SP"
	},
	{
		"id": 3510708,
		"name": "Cardoso",
		"stateCode": "SP"
	},
	{
		"id": 3510807,
		"name": "Casa Branca",
		"stateCode": "SP"
	},
	{
		"id": 3510906,
		"name": "Cássia dos Coqueiros",
		"stateCode": "SP"
	},
	{
		"id": 3511003,
		"name": "Castilho",
		"stateCode": "SP"
	},
	{
		"id": 3511102,
		"name": "Catanduva",
		"stateCode": "SP"
	},
	{
		"id": 3511201,
		"name": "Catiguá",
		"stateCode": "SP"
	},
	{
		"id": 3511300,
		"name": "Cedral",
		"stateCode": "SP"
	},
	{
		"id": 3511409,
		"name": "Cerqueira César",
		"stateCode": "SP"
	},
	{
		"id": 3511508,
		"name": "Cerquilho",
		"stateCode": "SP"
	},
	{
		"id": 3511607,
		"name": "Cesário Lange",
		"stateCode": "SP"
	},
	{
		"id": 3511706,
		"name": "Charqueada",
		"stateCode": "SP"
	},
	{
		"id": 3557204,
		"name": "Chavantes",
		"stateCode": "SP"
	},
	{
		"id": 3511904,
		"name": "Clementina",
		"stateCode": "SP"
	},
	{
		"id": 3512001,
		"name": "Colina",
		"stateCode": "SP"
	},
	{
		"id": 3512100,
		"name": "Colômbia",
		"stateCode": "SP"
	},
	{
		"id": 3512209,
		"name": "Conchal",
		"stateCode": "SP"
	},
	{
		"id": 3512308,
		"name": "Conchas",
		"stateCode": "SP"
	},
	{
		"id": 3512407,
		"name": "Cordeirópolis",
		"stateCode": "SP"
	},
	{
		"id": 3512506,
		"name": "Coroados",
		"stateCode": "SP"
	},
	{
		"id": 3512605,
		"name": "Coronel Macedo",
		"stateCode": "SP"
	},
	{
		"id": 3512704,
		"name": "Corumbataí",
		"stateCode": "SP"
	},
	{
		"id": 3512803,
		"name": "Cosmópolis",
		"stateCode": "SP"
	},
	{
		"id": 3512902,
		"name": "Cosmorama",
		"stateCode": "SP"
	},
	{
		"id": 3513009,
		"name": "Cotia",
		"stateCode": "SP"
	},
	{
		"id": 3513108,
		"name": "Cravinhos",
		"stateCode": "SP"
	},
	{
		"id": 3513207,
		"name": "Cristais Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3513306,
		"name": "Cruzália",
		"stateCode": "SP"
	},
	{
		"id": 3513405,
		"name": "Cruzeiro",
		"stateCode": "SP"
	},
	{
		"id": 3513504,
		"name": "Cubatão",
		"stateCode": "SP"
	},
	{
		"id": 3513603,
		"name": "Cunha",
		"stateCode": "SP"
	},
	{
		"id": 3513702,
		"name": "Descalvado",
		"stateCode": "SP"
	},
	{
		"id": 3513801,
		"name": "Diadema",
		"stateCode": "SP"
	},
	{
		"id": 3513850,
		"name": "Dirce Reis",
		"stateCode": "SP"
	},
	{
		"id": 3513900,
		"name": "Divinolândia",
		"stateCode": "SP"
	},
	{
		"id": 3514007,
		"name": "Dobrada",
		"stateCode": "SP"
	},
	{
		"id": 3514106,
		"name": "Dois Córregos",
		"stateCode": "SP"
	},
	{
		"id": 3514205,
		"name": "Dolcinópolis",
		"stateCode": "SP"
	},
	{
		"id": 3514304,
		"name": "Dourado",
		"stateCode": "SP"
	},
	{
		"id": 3514403,
		"name": "Dracena",
		"stateCode": "SP"
	},
	{
		"id": 3514502,
		"name": "Duartina",
		"stateCode": "SP"
	},
	{
		"id": 3514601,
		"name": "Dumont",
		"stateCode": "SP"
	},
	{
		"id": 3514700,
		"name": "Echaporã",
		"stateCode": "SP"
	},
	{
		"id": 3514809,
		"name": "Eldorado",
		"stateCode": "SP"
	},
	{
		"id": 3514908,
		"name": "Elias Fausto",
		"stateCode": "SP"
	},
	{
		"id": 3514924,
		"name": "Elisiário",
		"stateCode": "SP"
	},
	{
		"id": 3514957,
		"name": "Embaúba",
		"stateCode": "SP"
	},
	{
		"id": 3515004,
		"name": "Embu das Artes",
		"stateCode": "SP"
	},
	{
		"id": 3515103,
		"name": "Embu-Guaçu",
		"stateCode": "SP"
	},
	{
		"id": 3515129,
		"name": "Emilianópolis",
		"stateCode": "SP"
	},
	{
		"id": 3515152,
		"name": "Engenheiro Coelho",
		"stateCode": "SP"
	},
	{
		"id": 3515186,
		"name": "Espírito Santo do Pinhal",
		"stateCode": "SP"
	},
	{
		"id": 3515194,
		"name": "Espírito Santo do Turvo",
		"stateCode": "SP"
	},
	{
		"id": 3557303,
		"name": "Estiva Gerbi",
		"stateCode": "SP"
	},
	{
		"id": 3515202,
		"name": "Estrela d'Oeste",
		"stateCode": "SP"
	},
	{
		"id": 3515301,
		"name": "Estrela do Norte",
		"stateCode": "SP"
	},
	{
		"id": 3515350,
		"name": "Euclides da Cunha Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3515400,
		"name": "Fartura",
		"stateCode": "SP"
	},
	{
		"id": 3515608,
		"name": "Fernando Prestes",
		"stateCode": "SP"
	},
	{
		"id": 3515509,
		"name": "Fernandópolis",
		"stateCode": "SP"
	},
	{
		"id": 3515657,
		"name": "Fernão",
		"stateCode": "SP"
	},
	{
		"id": 3515707,
		"name": "Ferraz de Vasconcelos",
		"stateCode": "SP"
	},
	{
		"id": 3515806,
		"name": "Flora Rica",
		"stateCode": "SP"
	},
	{
		"id": 3515905,
		"name": "Floreal",
		"stateCode": "SP"
	},
	{
		"id": 3516002,
		"name": "Flórida Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3516101,
		"name": "Florínea",
		"stateCode": "SP"
	},
	{
		"id": 3516200,
		"name": "Franca",
		"stateCode": "SP"
	},
	{
		"id": 3516309,
		"name": "Francisco Morato",
		"stateCode": "SP"
	},
	{
		"id": 3516408,
		"name": "Franco da Rocha",
		"stateCode": "SP"
	},
	{
		"id": 3516507,
		"name": "Gabriel Monteiro",
		"stateCode": "SP"
	},
	{
		"id": 3516606,
		"name": "Gália",
		"stateCode": "SP"
	},
	{
		"id": 3516705,
		"name": "Garça",
		"stateCode": "SP"
	},
	{
		"id": 3516804,
		"name": "Gastão Vidigal",
		"stateCode": "SP"
	},
	{
		"id": 3516853,
		"name": "Gavião Peixoto",
		"stateCode": "SP"
	},
	{
		"id": 3516903,
		"name": "General Salgado",
		"stateCode": "SP"
	},
	{
		"id": 3517000,
		"name": "Getulina",
		"stateCode": "SP"
	},
	{
		"id": 3517109,
		"name": "Glicério",
		"stateCode": "SP"
	},
	{
		"id": 3517208,
		"name": "Guaiçara",
		"stateCode": "SP"
	},
	{
		"id": 3517307,
		"name": "Guaimbê",
		"stateCode": "SP"
	},
	{
		"id": 3517406,
		"name": "Guaíra",
		"stateCode": "SP"
	},
	{
		"id": 3517505,
		"name": "Guapiaçu",
		"stateCode": "SP"
	},
	{
		"id": 3517604,
		"name": "Guapiara",
		"stateCode": "SP"
	},
	{
		"id": 3517703,
		"name": "Guará",
		"stateCode": "SP"
	},
	{
		"id": 3517802,
		"name": "Guaraçaí",
		"stateCode": "SP"
	},
	{
		"id": 3517901,
		"name": "Guaraci",
		"stateCode": "SP"
	},
	{
		"id": 3518008,
		"name": "Guarani d'Oeste",
		"stateCode": "SP"
	},
	{
		"id": 3518107,
		"name": "Guarantã",
		"stateCode": "SP"
	},
	{
		"id": 3518206,
		"name": "Guararapes",
		"stateCode": "SP"
	},
	{
		"id": 3518305,
		"name": "Guararema",
		"stateCode": "SP"
	},
	{
		"id": 3518404,
		"name": "Guaratinguetá",
		"stateCode": "SP"
	},
	{
		"id": 3518503,
		"name": "Guareí",
		"stateCode": "SP"
	},
	{
		"id": 3518602,
		"name": "Guariba",
		"stateCode": "SP"
	},
	{
		"id": 3518701,
		"name": "Guarujá",
		"stateCode": "SP"
	},
	{
		"id": 3518800,
		"name": "Guarulhos",
		"stateCode": "SP"
	},
	{
		"id": 3518859,
		"name": "Guatapará",
		"stateCode": "SP"
	},
	{
		"id": 3518909,
		"name": "Guzolândia",
		"stateCode": "SP"
	},
	{
		"id": 3519006,
		"name": "Herculândia",
		"stateCode": "SP"
	},
	{
		"id": 3519055,
		"name": "Holambra",
		"stateCode": "SP"
	},
	{
		"id": 3519071,
		"name": "Hortolândia",
		"stateCode": "SP"
	},
	{
		"id": 3519105,
		"name": "Iacanga",
		"stateCode": "SP"
	},
	{
		"id": 3519204,
		"name": "Iacri",
		"stateCode": "SP"
	},
	{
		"id": 3519253,
		"name": "Iaras",
		"stateCode": "SP"
	},
	{
		"id": 3519303,
		"name": "Ibaté",
		"stateCode": "SP"
	},
	{
		"id": 3519402,
		"name": "Ibirá",
		"stateCode": "SP"
	},
	{
		"id": 3519501,
		"name": "Ibirarema",
		"stateCode": "SP"
	},
	{
		"id": 3519600,
		"name": "Ibitinga",
		"stateCode": "SP"
	},
	{
		"id": 3519709,
		"name": "Ibiúna",
		"stateCode": "SP"
	},
	{
		"id": 3519808,
		"name": "Icém",
		"stateCode": "SP"
	},
	{
		"id": 3519907,
		"name": "Iepê",
		"stateCode": "SP"
	},
	{
		"id": 3520004,
		"name": "Igaraçu do Tietê",
		"stateCode": "SP"
	},
	{
		"id": 3520103,
		"name": "Igarapava",
		"stateCode": "SP"
	},
	{
		"id": 3520202,
		"name": "Igaratá",
		"stateCode": "SP"
	},
	{
		"id": 3520301,
		"name": "Iguape",
		"stateCode": "SP"
	},
	{
		"id": 3520426,
		"name": "Ilha Comprida",
		"stateCode": "SP"
	},
	{
		"id": 3520442,
		"name": "Ilha Solteira",
		"stateCode": "SP"
	},
	{
		"id": 3520400,
		"name": "Ilhabela",
		"stateCode": "SP"
	},
	{
		"id": 3520509,
		"name": "Indaiatuba",
		"stateCode": "SP"
	},
	{
		"id": 3520608,
		"name": "Indiana",
		"stateCode": "SP"
	},
	{
		"id": 3520707,
		"name": "Indiaporã",
		"stateCode": "SP"
	},
	{
		"id": 3520806,
		"name": "Inúbia Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3520905,
		"name": "Ipaussu",
		"stateCode": "SP"
	},
	{
		"id": 3521002,
		"name": "Iperó",
		"stateCode": "SP"
	},
	{
		"id": 3521101,
		"name": "Ipeúna",
		"stateCode": "SP"
	},
	{
		"id": 3521150,
		"name": "Ipiguá",
		"stateCode": "SP"
	},
	{
		"id": 3521200,
		"name": "Iporanga",
		"stateCode": "SP"
	},
	{
		"id": 3521309,
		"name": "Ipuã",
		"stateCode": "SP"
	},
	{
		"id": 3521408,
		"name": "Iracemápolis",
		"stateCode": "SP"
	},
	{
		"id": 3521507,
		"name": "Irapuã",
		"stateCode": "SP"
	},
	{
		"id": 3521606,
		"name": "Irapuru",
		"stateCode": "SP"
	},
	{
		"id": 3521705,
		"name": "Itaberá",
		"stateCode": "SP"
	},
	{
		"id": 3521804,
		"name": "Itaí",
		"stateCode": "SP"
	},
	{
		"id": 3521903,
		"name": "Itajobi",
		"stateCode": "SP"
	},
	{
		"id": 3522000,
		"name": "Itaju",
		"stateCode": "SP"
	},
	{
		"id": 3522109,
		"name": "Itanhaém",
		"stateCode": "SP"
	},
	{
		"id": 3522158,
		"name": "Itaoca",
		"stateCode": "SP"
	},
	{
		"id": 3522208,
		"name": "Itapecerica da Serra",
		"stateCode": "SP"
	},
	{
		"id": 3522307,
		"name": "Itapetininga",
		"stateCode": "SP"
	},
	{
		"id": 3522406,
		"name": "Itapeva",
		"stateCode": "SP"
	},
	{
		"id": 3522505,
		"name": "Itapevi",
		"stateCode": "SP"
	},
	{
		"id": 3522604,
		"name": "Itapira",
		"stateCode": "SP"
	},
	{
		"id": 3522653,
		"name": "Itapirapuã Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3522703,
		"name": "Itápolis",
		"stateCode": "SP"
	},
	{
		"id": 3522802,
		"name": "Itaporanga",
		"stateCode": "SP"
	},
	{
		"id": 3522901,
		"name": "Itapuí",
		"stateCode": "SP"
	},
	{
		"id": 3523008,
		"name": "Itapura",
		"stateCode": "SP"
	},
	{
		"id": 3523107,
		"name": "Itaquaquecetuba",
		"stateCode": "SP"
	},
	{
		"id": 3523206,
		"name": "Itararé",
		"stateCode": "SP"
	},
	{
		"id": 3523305,
		"name": "Itariri",
		"stateCode": "SP"
	},
	{
		"id": 3523404,
		"name": "Itatiba",
		"stateCode": "SP"
	},
	{
		"id": 3523503,
		"name": "Itatinga",
		"stateCode": "SP"
	},
	{
		"id": 3523602,
		"name": "Itirapina",
		"stateCode": "SP"
	},
	{
		"id": 3523701,
		"name": "Itirapuã",
		"stateCode": "SP"
	},
	{
		"id": 3523800,
		"name": "Itobi",
		"stateCode": "SP"
	},
	{
		"id": 3523909,
		"name": "Itu",
		"stateCode": "SP"
	},
	{
		"id": 3524006,
		"name": "Itupeva",
		"stateCode": "SP"
	},
	{
		"id": 3524105,
		"name": "Ituverava",
		"stateCode": "SP"
	},
	{
		"id": 3524204,
		"name": "Jaborandi",
		"stateCode": "SP"
	},
	{
		"id": 3524303,
		"name": "Jaboticabal",
		"stateCode": "SP"
	},
	{
		"id": 3524402,
		"name": "Jacareí",
		"stateCode": "SP"
	},
	{
		"id": 3524501,
		"name": "Jaci",
		"stateCode": "SP"
	},
	{
		"id": 3524600,
		"name": "Jacupiranga",
		"stateCode": "SP"
	},
	{
		"id": 3524709,
		"name": "Jaguariúna",
		"stateCode": "SP"
	},
	{
		"id": 3524808,
		"name": "Jales",
		"stateCode": "SP"
	},
	{
		"id": 3524907,
		"name": "Jambeiro",
		"stateCode": "SP"
	},
	{
		"id": 3525003,
		"name": "Jandira",
		"stateCode": "SP"
	},
	{
		"id": 3525102,
		"name": "Jardinópolis",
		"stateCode": "SP"
	},
	{
		"id": 3525201,
		"name": "Jarinu",
		"stateCode": "SP"
	},
	{
		"id": 3525300,
		"name": "Jaú",
		"stateCode": "SP"
	},
	{
		"id": 3525409,
		"name": "Jeriquara",
		"stateCode": "SP"
	},
	{
		"id": 3525508,
		"name": "Joanópolis",
		"stateCode": "SP"
	},
	{
		"id": 3525607,
		"name": "João Ramalho",
		"stateCode": "SP"
	},
	{
		"id": 3525706,
		"name": "José Bonifácio",
		"stateCode": "SP"
	},
	{
		"id": 3525805,
		"name": "Júlio Mesquita",
		"stateCode": "SP"
	},
	{
		"id": 3525854,
		"name": "Jumirim",
		"stateCode": "SP"
	},
	{
		"id": 3525904,
		"name": "Jundiaí",
		"stateCode": "SP"
	},
	{
		"id": 3526001,
		"name": "Junqueirópolis",
		"stateCode": "SP"
	},
	{
		"id": 3526100,
		"name": "Juquiá",
		"stateCode": "SP"
	},
	{
		"id": 3526209,
		"name": "Juquitiba",
		"stateCode": "SP"
	},
	{
		"id": 3526308,
		"name": "Lagoinha",
		"stateCode": "SP"
	},
	{
		"id": 3526407,
		"name": "Laranjal Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3526506,
		"name": "Lavínia",
		"stateCode": "SP"
	},
	{
		"id": 3526605,
		"name": "Lavrinhas",
		"stateCode": "SP"
	},
	{
		"id": 3526704,
		"name": "Leme",
		"stateCode": "SP"
	},
	{
		"id": 3526803,
		"name": "Lençóis Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3526902,
		"name": "Limeira",
		"stateCode": "SP"
	},
	{
		"id": 3527009,
		"name": "Lindóia",
		"stateCode": "SP"
	},
	{
		"id": 3527108,
		"name": "Lins",
		"stateCode": "SP"
	},
	{
		"id": 3527207,
		"name": "Lorena",
		"stateCode": "SP"
	},
	{
		"id": 3527256,
		"name": "Lourdes",
		"stateCode": "SP"
	},
	{
		"id": 3527306,
		"name": "Louveira",
		"stateCode": "SP"
	},
	{
		"id": 3527405,
		"name": "Lucélia",
		"stateCode": "SP"
	},
	{
		"id": 3527504,
		"name": "Lucianópolis",
		"stateCode": "SP"
	},
	{
		"id": 3527603,
		"name": "Luís Antônio",
		"stateCode": "SP"
	},
	{
		"id": 3527702,
		"name": "Luiziânia",
		"stateCode": "SP"
	},
	{
		"id": 3527801,
		"name": "Lupércio",
		"stateCode": "SP"
	},
	{
		"id": 3527900,
		"name": "Lutécia",
		"stateCode": "SP"
	},
	{
		"id": 3528007,
		"name": "Macatuba",
		"stateCode": "SP"
	},
	{
		"id": 3528106,
		"name": "Macaubal",
		"stateCode": "SP"
	},
	{
		"id": 3528205,
		"name": "Macedônia",
		"stateCode": "SP"
	},
	{
		"id": 3528304,
		"name": "Magda",
		"stateCode": "SP"
	},
	{
		"id": 3528403,
		"name": "Mairinque",
		"stateCode": "SP"
	},
	{
		"id": 3528502,
		"name": "Mairiporã",
		"stateCode": "SP"
	},
	{
		"id": 3528601,
		"name": "Manduri",
		"stateCode": "SP"
	},
	{
		"id": 3528700,
		"name": "Marabá Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3528809,
		"name": "Maracaí",
		"stateCode": "SP"
	},
	{
		"id": 3528858,
		"name": "Marapoama",
		"stateCode": "SP"
	},
	{
		"id": 3528908,
		"name": "Mariápolis",
		"stateCode": "SP"
	},
	{
		"id": 3529005,
		"name": "Marília",
		"stateCode": "SP"
	},
	{
		"id": 3529104,
		"name": "Marinópolis",
		"stateCode": "SP"
	},
	{
		"id": 3529203,
		"name": "Martinópolis",
		"stateCode": "SP"
	},
	{
		"id": 3529302,
		"name": "Matão",
		"stateCode": "SP"
	},
	{
		"id": 3529401,
		"name": "Mauá",
		"stateCode": "SP"
	},
	{
		"id": 3529500,
		"name": "Mendonça",
		"stateCode": "SP"
	},
	{
		"id": 3529609,
		"name": "Meridiano",
		"stateCode": "SP"
	},
	{
		"id": 3529658,
		"name": "Mesópolis",
		"stateCode": "SP"
	},
	{
		"id": 3529708,
		"name": "Miguelópolis",
		"stateCode": "SP"
	},
	{
		"id": 3529807,
		"name": "Mineiros do Tietê",
		"stateCode": "SP"
	},
	{
		"id": 3530003,
		"name": "Mira Estrela",
		"stateCode": "SP"
	},
	{
		"id": 3529906,
		"name": "Miracatu",
		"stateCode": "SP"
	},
	{
		"id": 3530102,
		"name": "Mirandópolis",
		"stateCode": "SP"
	},
	{
		"id": 3530201,
		"name": "Mirante do Paranapanema",
		"stateCode": "SP"
	},
	{
		"id": 3530300,
		"name": "Mirassol",
		"stateCode": "SP"
	},
	{
		"id": 3530409,
		"name": "Mirassolândia",
		"stateCode": "SP"
	},
	{
		"id": 3530508,
		"name": "Mococa",
		"stateCode": "SP"
	},
	{
		"id": 3530607,
		"name": "Mogi das Cruzes",
		"stateCode": "SP"
	},
	{
		"id": 3530706,
		"name": "Mogi Guaçu",
		"stateCode": "SP"
	},
	{
		"id": 3530805,
		"name": "Mogi Mirim",
		"stateCode": "SP"
	},
	{
		"id": 3530904,
		"name": "Mombuca",
		"stateCode": "SP"
	},
	{
		"id": 3531001,
		"name": "Monções",
		"stateCode": "SP"
	},
	{
		"id": 3531100,
		"name": "Mongaguá",
		"stateCode": "SP"
	},
	{
		"id": 3531209,
		"name": "Monte Alegre do Sul",
		"stateCode": "SP"
	},
	{
		"id": 3531308,
		"name": "Monte Alto",
		"stateCode": "SP"
	},
	{
		"id": 3531407,
		"name": "Monte Aprazível",
		"stateCode": "SP"
	},
	{
		"id": 3531506,
		"name": "Monte Azul Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3531605,
		"name": "Monte Castelo",
		"stateCode": "SP"
	},
	{
		"id": 3531803,
		"name": "Monte Mor",
		"stateCode": "SP"
	},
	{
		"id": 3531704,
		"name": "Monteiro Lobato",
		"stateCode": "SP"
	},
	{
		"id": 3531902,
		"name": "Morro Agudo",
		"stateCode": "SP"
	},
	{
		"id": 3532009,
		"name": "Morungaba",
		"stateCode": "SP"
	},
	{
		"id": 3532058,
		"name": "Motuca",
		"stateCode": "SP"
	},
	{
		"id": 3532108,
		"name": "Murutinga do Sul",
		"stateCode": "SP"
	},
	{
		"id": 3532157,
		"name": "Nantes",
		"stateCode": "SP"
	},
	{
		"id": 3532207,
		"name": "Narandiba",
		"stateCode": "SP"
	},
	{
		"id": 3532306,
		"name": "Natividade da Serra",
		"stateCode": "SP"
	},
	{
		"id": 3532405,
		"name": "Nazaré Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3532504,
		"name": "Neves Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3532603,
		"name": "Nhandeara",
		"stateCode": "SP"
	},
	{
		"id": 3532702,
		"name": "Nipoã",
		"stateCode": "SP"
	},
	{
		"id": 3532801,
		"name": "Nova Aliança",
		"stateCode": "SP"
	},
	{
		"id": 3532827,
		"name": "Nova Campina",
		"stateCode": "SP"
	},
	{
		"id": 3532843,
		"name": "Nova Canaã Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3532868,
		"name": "Nova Castilho",
		"stateCode": "SP"
	},
	{
		"id": 3532900,
		"name": "Nova Europa",
		"stateCode": "SP"
	},
	{
		"id": 3533007,
		"name": "Nova Granada",
		"stateCode": "SP"
	},
	{
		"id": 3533106,
		"name": "Nova Guataporanga",
		"stateCode": "SP"
	},
	{
		"id": 3533205,
		"name": "Nova Independência",
		"stateCode": "SP"
	},
	{
		"id": 3533304,
		"name": "Nova Luzitânia",
		"stateCode": "SP"
	},
	{
		"id": 3533403,
		"name": "Nova Odessa",
		"stateCode": "SP"
	},
	{
		"id": 3533254,
		"name": "Novais",
		"stateCode": "SP"
	},
	{
		"id": 3533502,
		"name": "Novo Horizonte",
		"stateCode": "SP"
	},
	{
		"id": 3533601,
		"name": "Nuporanga",
		"stateCode": "SP"
	},
	{
		"id": 3533700,
		"name": "Ocauçu",
		"stateCode": "SP"
	},
	{
		"id": 3533809,
		"name": "Óleo",
		"stateCode": "SP"
	},
	{
		"id": 3533908,
		"name": "Olímpia",
		"stateCode": "SP"
	},
	{
		"id": 3534005,
		"name": "Onda Verde",
		"stateCode": "SP"
	},
	{
		"id": 3534104,
		"name": "Oriente",
		"stateCode": "SP"
	},
	{
		"id": 3534203,
		"name": "Orindiúva",
		"stateCode": "SP"
	},
	{
		"id": 3534302,
		"name": "Orlândia",
		"stateCode": "SP"
	},
	{
		"id": 3534401,
		"name": "Osasco",
		"stateCode": "SP"
	},
	{
		"id": 3534500,
		"name": "Oscar Bressane",
		"stateCode": "SP"
	},
	{
		"id": 3534609,
		"name": "Osvaldo Cruz",
		"stateCode": "SP"
	},
	{
		"id": 3534708,
		"name": "Ourinhos",
		"stateCode": "SP"
	},
	{
		"id": 3534807,
		"name": "Ouro Verde",
		"stateCode": "SP"
	},
	{
		"id": 3534757,
		"name": "Ouroeste",
		"stateCode": "SP"
	},
	{
		"id": 3534906,
		"name": "Pacaembu",
		"stateCode": "SP"
	},
	{
		"id": 3535002,
		"name": "Palestina",
		"stateCode": "SP"
	},
	{
		"id": 3535101,
		"name": "Palmares Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3535200,
		"name": "Palmeira d'Oeste",
		"stateCode": "SP"
	},
	{
		"id": 3535309,
		"name": "Palmital",
		"stateCode": "SP"
	},
	{
		"id": 3535408,
		"name": "Panorama",
		"stateCode": "SP"
	},
	{
		"id": 3535507,
		"name": "Paraguaçu Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3535606,
		"name": "Paraibuna",
		"stateCode": "SP"
	},
	{
		"id": 3535705,
		"name": "Paraíso",
		"stateCode": "SP"
	},
	{
		"id": 3535804,
		"name": "Paranapanema",
		"stateCode": "SP"
	},
	{
		"id": 3535903,
		"name": "Paranapuã",
		"stateCode": "SP"
	},
	{
		"id": 3536000,
		"name": "Parapuã",
		"stateCode": "SP"
	},
	{
		"id": 3536109,
		"name": "Pardinho",
		"stateCode": "SP"
	},
	{
		"id": 3536208,
		"name": "Pariquera-Açu",
		"stateCode": "SP"
	},
	{
		"id": 3536257,
		"name": "Parisi",
		"stateCode": "SP"
	},
	{
		"id": 3536307,
		"name": "Patrocínio Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3536406,
		"name": "Paulicéia",
		"stateCode": "SP"
	},
	{
		"id": 3536505,
		"name": "Paulínia",
		"stateCode": "SP"
	},
	{
		"id": 3536570,
		"name": "Paulistânia",
		"stateCode": "SP"
	},
	{
		"id": 3536604,
		"name": "Paulo de Faria",
		"stateCode": "SP"
	},
	{
		"id": 3536703,
		"name": "Pederneiras",
		"stateCode": "SP"
	},
	{
		"id": 3536802,
		"name": "Pedra Bela",
		"stateCode": "SP"
	},
	{
		"id": 3536901,
		"name": "Pedranópolis",
		"stateCode": "SP"
	},
	{
		"id": 3537008,
		"name": "Pedregulho",
		"stateCode": "SP"
	},
	{
		"id": 3537107,
		"name": "Pedreira",
		"stateCode": "SP"
	},
	{
		"id": 3537156,
		"name": "Pedrinhas Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3537206,
		"name": "Pedro de Toledo",
		"stateCode": "SP"
	},
	{
		"id": 3537305,
		"name": "Penápolis",
		"stateCode": "SP"
	},
	{
		"id": 3537404,
		"name": "Pereira Barreto",
		"stateCode": "SP"
	},
	{
		"id": 3537503,
		"name": "Pereiras",
		"stateCode": "SP"
	},
	{
		"id": 3537602,
		"name": "Peruíbe",
		"stateCode": "SP"
	},
	{
		"id": 3537701,
		"name": "Piacatu",
		"stateCode": "SP"
	},
	{
		"id": 3537800,
		"name": "Piedade",
		"stateCode": "SP"
	},
	{
		"id": 3537909,
		"name": "Pilar do Sul",
		"stateCode": "SP"
	},
	{
		"id": 3538006,
		"name": "Pindamonhangaba",
		"stateCode": "SP"
	},
	{
		"id": 3538105,
		"name": "Pindorama",
		"stateCode": "SP"
	},
	{
		"id": 3538204,
		"name": "Pinhalzinho",
		"stateCode": "SP"
	},
	{
		"id": 3538303,
		"name": "Piquerobi",
		"stateCode": "SP"
	},
	{
		"id": 3538501,
		"name": "Piquete",
		"stateCode": "SP"
	},
	{
		"id": 3538600,
		"name": "Piracaia",
		"stateCode": "SP"
	},
	{
		"id": 3538709,
		"name": "Piracicaba",
		"stateCode": "SP"
	},
	{
		"id": 3538808,
		"name": "Piraju",
		"stateCode": "SP"
	},
	{
		"id": 3538907,
		"name": "Pirajuí",
		"stateCode": "SP"
	},
	{
		"id": 3539004,
		"name": "Pirangi",
		"stateCode": "SP"
	},
	{
		"id": 3539103,
		"name": "Pirapora do Bom Jesus",
		"stateCode": "SP"
	},
	{
		"id": 3539202,
		"name": "Pirapozinho",
		"stateCode": "SP"
	},
	{
		"id": 3539301,
		"name": "Pirassununga",
		"stateCode": "SP"
	},
	{
		"id": 3539400,
		"name": "Piratininga",
		"stateCode": "SP"
	},
	{
		"id": 3539509,
		"name": "Pitangueiras",
		"stateCode": "SP"
	},
	{
		"id": 3539608,
		"name": "Planalto",
		"stateCode": "SP"
	},
	{
		"id": 3539707,
		"name": "Platina",
		"stateCode": "SP"
	},
	{
		"id": 3539806,
		"name": "Poá",
		"stateCode": "SP"
	},
	{
		"id": 3539905,
		"name": "Poloni",
		"stateCode": "SP"
	},
	{
		"id": 3540002,
		"name": "Pompéia",
		"stateCode": "SP"
	},
	{
		"id": 3540101,
		"name": "Pongaí",
		"stateCode": "SP"
	},
	{
		"id": 3540200,
		"name": "Pontal",
		"stateCode": "SP"
	},
	{
		"id": 3540259,
		"name": "Pontalinda",
		"stateCode": "SP"
	},
	{
		"id": 3540309,
		"name": "Pontes Gestal",
		"stateCode": "SP"
	},
	{
		"id": 3540408,
		"name": "Populina",
		"stateCode": "SP"
	},
	{
		"id": 3540507,
		"name": "Porangaba",
		"stateCode": "SP"
	},
	{
		"id": 3540606,
		"name": "Porto Feliz",
		"stateCode": "SP"
	},
	{
		"id": 3540705,
		"name": "Porto Ferreira",
		"stateCode": "SP"
	},
	{
		"id": 3540754,
		"name": "Potim",
		"stateCode": "SP"
	},
	{
		"id": 3540804,
		"name": "Potirendaba",
		"stateCode": "SP"
	},
	{
		"id": 3540853,
		"name": "Pracinha",
		"stateCode": "SP"
	},
	{
		"id": 3540903,
		"name": "Pradópolis",
		"stateCode": "SP"
	},
	{
		"id": 3541000,
		"name": "Praia Grande",
		"stateCode": "SP"
	},
	{
		"id": 3541059,
		"name": "Pratânia",
		"stateCode": "SP"
	},
	{
		"id": 3541109,
		"name": "Presidente Alves",
		"stateCode": "SP"
	},
	{
		"id": 3541208,
		"name": "Presidente Bernardes",
		"stateCode": "SP"
	},
	{
		"id": 3541307,
		"name": "Presidente Epitácio",
		"stateCode": "SP"
	},
	{
		"id": 3541406,
		"name": "Presidente Prudente",
		"stateCode": "SP"
	},
	{
		"id": 3541505,
		"name": "Presidente Venceslau",
		"stateCode": "SP"
	},
	{
		"id": 3541604,
		"name": "Promissão",
		"stateCode": "SP"
	},
	{
		"id": 3541653,
		"name": "Quadra",
		"stateCode": "SP"
	},
	{
		"id": 3541703,
		"name": "Quatá",
		"stateCode": "SP"
	},
	{
		"id": 3541802,
		"name": "Queiroz",
		"stateCode": "SP"
	},
	{
		"id": 3541901,
		"name": "Queluz",
		"stateCode": "SP"
	},
	{
		"id": 3542008,
		"name": "Quintana",
		"stateCode": "SP"
	},
	{
		"id": 3542107,
		"name": "Rafard",
		"stateCode": "SP"
	},
	{
		"id": 3542206,
		"name": "Rancharia",
		"stateCode": "SP"
	},
	{
		"id": 3542305,
		"name": "Redenção da Serra",
		"stateCode": "SP"
	},
	{
		"id": 3542404,
		"name": "Regente Feijó",
		"stateCode": "SP"
	},
	{
		"id": 3542503,
		"name": "Reginópolis",
		"stateCode": "SP"
	},
	{
		"id": 3542602,
		"name": "Registro",
		"stateCode": "SP"
	},
	{
		"id": 3542701,
		"name": "Restinga",
		"stateCode": "SP"
	},
	{
		"id": 3542800,
		"name": "Ribeira",
		"stateCode": "SP"
	},
	{
		"id": 3542909,
		"name": "Ribeirão Bonito",
		"stateCode": "SP"
	},
	{
		"id": 3543006,
		"name": "Ribeirão Branco",
		"stateCode": "SP"
	},
	{
		"id": 3543105,
		"name": "Ribeirão Corrente",
		"stateCode": "SP"
	},
	{
		"id": 3543204,
		"name": "Ribeirão do Sul",
		"stateCode": "SP"
	},
	{
		"id": 3543238,
		"name": "Ribeirão dos Índios",
		"stateCode": "SP"
	},
	{
		"id": 3543253,
		"name": "Ribeirão Grande",
		"stateCode": "SP"
	},
	{
		"id": 3543303,
		"name": "Ribeirão Pires",
		"stateCode": "SP"
	},
	{
		"id": 3543402,
		"name": "Ribeirão Preto",
		"stateCode": "SP"
	},
	{
		"id": 3543600,
		"name": "Rifaina",
		"stateCode": "SP"
	},
	{
		"id": 3543709,
		"name": "Rincão",
		"stateCode": "SP"
	},
	{
		"id": 3543808,
		"name": "Rinópolis",
		"stateCode": "SP"
	},
	{
		"id": 3543907,
		"name": "Rio Claro",
		"stateCode": "SP"
	},
	{
		"id": 3544004,
		"name": "Rio das Pedras",
		"stateCode": "SP"
	},
	{
		"id": 3544103,
		"name": "Rio Grande da Serra",
		"stateCode": "SP"
	},
	{
		"id": 3544202,
		"name": "Riolândia",
		"stateCode": "SP"
	},
	{
		"id": 3543501,
		"name": "Riversul",
		"stateCode": "SP"
	},
	{
		"id": 3544251,
		"name": "Rosana",
		"stateCode": "SP"
	},
	{
		"id": 3544301,
		"name": "Roseira",
		"stateCode": "SP"
	},
	{
		"id": 3544400,
		"name": "Rubiácea",
		"stateCode": "SP"
	},
	{
		"id": 3544509,
		"name": "Rubinéia",
		"stateCode": "SP"
	},
	{
		"id": 3544608,
		"name": "Sabino",
		"stateCode": "SP"
	},
	{
		"id": 3544707,
		"name": "Sagres",
		"stateCode": "SP"
	},
	{
		"id": 3544806,
		"name": "Sales",
		"stateCode": "SP"
	},
	{
		"id": 3544905,
		"name": "Sales Oliveira",
		"stateCode": "SP"
	},
	{
		"id": 3545001,
		"name": "Salesópolis",
		"stateCode": "SP"
	},
	{
		"id": 3545100,
		"name": "Salmourão",
		"stateCode": "SP"
	},
	{
		"id": 3545159,
		"name": "Saltinho",
		"stateCode": "SP"
	},
	{
		"id": 3545209,
		"name": "Salto",
		"stateCode": "SP"
	},
	{
		"id": 3545308,
		"name": "Salto de Pirapora",
		"stateCode": "SP"
	},
	{
		"id": 3545407,
		"name": "Salto Grande",
		"stateCode": "SP"
	},
	{
		"id": 3545506,
		"name": "Sandovalina",
		"stateCode": "SP"
	},
	{
		"id": 3545605,
		"name": "Santa Adélia",
		"stateCode": "SP"
	},
	{
		"id": 3545704,
		"name": "Santa Albertina",
		"stateCode": "SP"
	},
	{
		"id": 3545803,
		"name": "Santa Bárbara d'Oeste",
		"stateCode": "SP"
	},
	{
		"id": 3546009,
		"name": "Santa Branca",
		"stateCode": "SP"
	},
	{
		"id": 3546108,
		"name": "Santa Clara d'Oeste",
		"stateCode": "SP"
	},
	{
		"id": 3546207,
		"name": "Santa Cruz da Conceição",
		"stateCode": "SP"
	},
	{
		"id": 3546256,
		"name": "Santa Cruz da Esperança",
		"stateCode": "SP"
	},
	{
		"id": 3546306,
		"name": "Santa Cruz das Palmeiras",
		"stateCode": "SP"
	},
	{
		"id": 3546405,
		"name": "Santa Cruz do Rio Pardo",
		"stateCode": "SP"
	},
	{
		"id": 3546504,
		"name": "Santa Ernestina",
		"stateCode": "SP"
	},
	{
		"id": 3546603,
		"name": "Santa Fé do Sul",
		"stateCode": "SP"
	},
	{
		"id": 3546702,
		"name": "Santa Gertrudes",
		"stateCode": "SP"
	},
	{
		"id": 3546801,
		"name": "Santa Isabel",
		"stateCode": "SP"
	},
	{
		"id": 3546900,
		"name": "Santa Lúcia",
		"stateCode": "SP"
	},
	{
		"id": 3547007,
		"name": "Santa Maria da Serra",
		"stateCode": "SP"
	},
	{
		"id": 3547106,
		"name": "Santa Mercedes",
		"stateCode": "SP"
	},
	{
		"id": 3547403,
		"name": "Santa Rita d'Oeste",
		"stateCode": "SP"
	},
	{
		"id": 3547502,
		"name": "Santa Rita do Passa Quatro",
		"stateCode": "SP"
	},
	{
		"id": 3547601,
		"name": "Santa Rosa de Viterbo",
		"stateCode": "SP"
	},
	{
		"id": 3547650,
		"name": "Santa Salete",
		"stateCode": "SP"
	},
	{
		"id": 3547205,
		"name": "Santana da Ponte Pensa",
		"stateCode": "SP"
	},
	{
		"id": 3547304,
		"name": "Santana de Parnaíba",
		"stateCode": "SP"
	},
	{
		"id": 3547700,
		"name": "Santo Anastácio",
		"stateCode": "SP"
	},
	{
		"id": 3547809,
		"name": "Santo André",
		"stateCode": "SP"
	},
	{
		"id": 3547908,
		"name": "Santo Antônio da Alegria",
		"stateCode": "SP"
	},
	{
		"id": 3548005,
		"name": "Santo Antônio de Posse",
		"stateCode": "SP"
	},
	{
		"id": 3548054,
		"name": "Santo Antônio do Aracanguá",
		"stateCode": "SP"
	},
	{
		"id": 3548104,
		"name": "Santo Antônio do Jardim",
		"stateCode": "SP"
	},
	{
		"id": 3548203,
		"name": "Santo Antônio do Pinhal",
		"stateCode": "SP"
	},
	{
		"id": 3548302,
		"name": "Santo Expedito",
		"stateCode": "SP"
	},
	{
		"id": 3548401,
		"name": "Santópolis do Aguapeí",
		"stateCode": "SP"
	},
	{
		"id": 3548500,
		"name": "Santos",
		"stateCode": "SP"
	},
	{
		"id": 3548609,
		"name": "São Bento do Sapucaí",
		"stateCode": "SP"
	},
	{
		"id": 3548708,
		"name": "São Bernardo do Campo",
		"stateCode": "SP"
	},
	{
		"id": 3548807,
		"name": "São Caetano do Sul",
		"stateCode": "SP"
	},
	{
		"id": 3548906,
		"name": "São Carlos",
		"stateCode": "SP"
	},
	{
		"id": 3549003,
		"name": "São Francisco",
		"stateCode": "SP"
	},
	{
		"id": 3549102,
		"name": "São João da Boa Vista",
		"stateCode": "SP"
	},
	{
		"id": 3549201,
		"name": "São João das Duas Pontes",
		"stateCode": "SP"
	},
	{
		"id": 3549250,
		"name": "São João de Iracema",
		"stateCode": "SP"
	},
	{
		"id": 3549300,
		"name": "São João do Pau d'Alho",
		"stateCode": "SP"
	},
	{
		"id": 3549409,
		"name": "São Joaquim da Barra",
		"stateCode": "SP"
	},
	{
		"id": 3549508,
		"name": "São José da Bela Vista",
		"stateCode": "SP"
	},
	{
		"id": 3549607,
		"name": "São José do Barreiro",
		"stateCode": "SP"
	},
	{
		"id": 3549706,
		"name": "São José do Rio Pardo",
		"stateCode": "SP"
	},
	{
		"id": 3549805,
		"name": "São José do Rio Preto",
		"stateCode": "SP"
	},
	{
		"id": 3549904,
		"name": "São José dos Campos",
		"stateCode": "SP"
	},
	{
		"id": 3549953,
		"name": "São Lourenço da Serra",
		"stateCode": "SP"
	},
	{
		"id": 3550001,
		"name": "São Luiz do Paraitinga",
		"stateCode": "SP"
	},
	{
		"id": 3550100,
		"name": "São Manuel",
		"stateCode": "SP"
	},
	{
		"id": 3550209,
		"name": "São Miguel Arcanjo",
		"stateCode": "SP"
	},
	{
		"id": 3550308,
		"name": "São Paulo",
		"stateCode": "SP"
	},
	{
		"id": 3550407,
		"name": "São Pedro",
		"stateCode": "SP"
	},
	{
		"id": 3550506,
		"name": "São Pedro do Turvo",
		"stateCode": "SP"
	},
	{
		"id": 3550605,
		"name": "São Roque",
		"stateCode": "SP"
	},
	{
		"id": 3550704,
		"name": "São Sebastião",
		"stateCode": "SP"
	},
	{
		"id": 3550803,
		"name": "São Sebastião da Grama",
		"stateCode": "SP"
	},
	{
		"id": 3550902,
		"name": "São Simão",
		"stateCode": "SP"
	},
	{
		"id": 3551009,
		"name": "São Vicente",
		"stateCode": "SP"
	},
	{
		"id": 3551108,
		"name": "Sarapuí",
		"stateCode": "SP"
	},
	{
		"id": 3551207,
		"name": "Sarutaiá",
		"stateCode": "SP"
	},
	{
		"id": 3551306,
		"name": "Sebastianópolis do Sul",
		"stateCode": "SP"
	},
	{
		"id": 3551405,
		"name": "Serra Azul",
		"stateCode": "SP"
	},
	{
		"id": 3551603,
		"name": "Serra Negra",
		"stateCode": "SP"
	},
	{
		"id": 3551504,
		"name": "Serrana",
		"stateCode": "SP"
	},
	{
		"id": 3551702,
		"name": "Sertãozinho",
		"stateCode": "SP"
	},
	{
		"id": 3551801,
		"name": "Sete Barras",
		"stateCode": "SP"
	},
	{
		"id": 3551900,
		"name": "Severínia",
		"stateCode": "SP"
	},
	{
		"id": 3552007,
		"name": "Silveiras",
		"stateCode": "SP"
	},
	{
		"id": 3552106,
		"name": "Socorro",
		"stateCode": "SP"
	},
	{
		"id": 3552205,
		"name": "Sorocaba",
		"stateCode": "SP"
	},
	{
		"id": 3552304,
		"name": "Sud Mennucci",
		"stateCode": "SP"
	},
	{
		"id": 3552403,
		"name": "Sumaré",
		"stateCode": "SP"
	},
	{
		"id": 3552551,
		"name": "Suzanápolis",
		"stateCode": "SP"
	},
	{
		"id": 3552502,
		"name": "Suzano",
		"stateCode": "SP"
	},
	{
		"id": 3552601,
		"name": "Tabapuã",
		"stateCode": "SP"
	},
	{
		"id": 3552700,
		"name": "Tabatinga",
		"stateCode": "SP"
	},
	{
		"id": 3552809,
		"name": "Taboão da Serra",
		"stateCode": "SP"
	},
	{
		"id": 3552908,
		"name": "Taciba",
		"stateCode": "SP"
	},
	{
		"id": 3553005,
		"name": "Taguaí",
		"stateCode": "SP"
	},
	{
		"id": 3553104,
		"name": "Taiaçu",
		"stateCode": "SP"
	},
	{
		"id": 3553203,
		"name": "Taiúva",
		"stateCode": "SP"
	},
	{
		"id": 3553302,
		"name": "Tambaú",
		"stateCode": "SP"
	},
	{
		"id": 3553401,
		"name": "Tanabi",
		"stateCode": "SP"
	},
	{
		"id": 3553500,
		"name": "Tapiraí",
		"stateCode": "SP"
	},
	{
		"id": 3553609,
		"name": "Tapiratiba",
		"stateCode": "SP"
	},
	{
		"id": 3553658,
		"name": "Taquaral",
		"stateCode": "SP"
	},
	{
		"id": 3553708,
		"name": "Taquaritinga",
		"stateCode": "SP"
	},
	{
		"id": 3553807,
		"name": "Taquarituba",
		"stateCode": "SP"
	},
	{
		"id": 3553856,
		"name": "Taquarivaí",
		"stateCode": "SP"
	},
	{
		"id": 3553906,
		"name": "Tarabai",
		"stateCode": "SP"
	},
	{
		"id": 3553955,
		"name": "Tarumã",
		"stateCode": "SP"
	},
	{
		"id": 3554003,
		"name": "Tatuí",
		"stateCode": "SP"
	},
	{
		"id": 3554102,
		"name": "Taubaté",
		"stateCode": "SP"
	},
	{
		"id": 3554201,
		"name": "Tejupá",
		"stateCode": "SP"
	},
	{
		"id": 3554300,
		"name": "Teodoro Sampaio",
		"stateCode": "SP"
	},
	{
		"id": 3554409,
		"name": "Terra Roxa",
		"stateCode": "SP"
	},
	{
		"id": 3554508,
		"name": "Tietê",
		"stateCode": "SP"
	},
	{
		"id": 3554607,
		"name": "Timburi",
		"stateCode": "SP"
	},
	{
		"id": 3554656,
		"name": "Torre de Pedra",
		"stateCode": "SP"
	},
	{
		"id": 3554706,
		"name": "Torrinha",
		"stateCode": "SP"
	},
	{
		"id": 3554755,
		"name": "Trabiju",
		"stateCode": "SP"
	},
	{
		"id": 3554805,
		"name": "Tremembé",
		"stateCode": "SP"
	},
	{
		"id": 3554904,
		"name": "Três Fronteiras",
		"stateCode": "SP"
	},
	{
		"id": 3554953,
		"name": "Tuiuti",
		"stateCode": "SP"
	},
	{
		"id": 3555000,
		"name": "Tupã",
		"stateCode": "SP"
	},
	{
		"id": 3555109,
		"name": "Tupi Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3555208,
		"name": "Turiúba",
		"stateCode": "SP"
	},
	{
		"id": 3555307,
		"name": "Turmalina",
		"stateCode": "SP"
	},
	{
		"id": 3555356,
		"name": "Ubarana",
		"stateCode": "SP"
	},
	{
		"id": 3555406,
		"name": "Ubatuba",
		"stateCode": "SP"
	},
	{
		"id": 3555505,
		"name": "Ubirajara",
		"stateCode": "SP"
	},
	{
		"id": 3555604,
		"name": "Uchoa",
		"stateCode": "SP"
	},
	{
		"id": 3555703,
		"name": "União Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3555802,
		"name": "Urânia",
		"stateCode": "SP"
	},
	{
		"id": 3555901,
		"name": "Uru",
		"stateCode": "SP"
	},
	{
		"id": 3556008,
		"name": "Urupês",
		"stateCode": "SP"
	},
	{
		"id": 3556107,
		"name": "Valentim Gentil",
		"stateCode": "SP"
	},
	{
		"id": 3556206,
		"name": "Valinhos",
		"stateCode": "SP"
	},
	{
		"id": 3556305,
		"name": "Valparaíso",
		"stateCode": "SP"
	},
	{
		"id": 3556354,
		"name": "Vargem",
		"stateCode": "SP"
	},
	{
		"id": 3556404,
		"name": "Vargem Grande do Sul",
		"stateCode": "SP"
	},
	{
		"id": 3556453,
		"name": "Vargem Grande Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3556503,
		"name": "Várzea Paulista",
		"stateCode": "SP"
	},
	{
		"id": 3556602,
		"name": "Vera Cruz",
		"stateCode": "SP"
	},
	{
		"id": 3556701,
		"name": "Vinhedo",
		"stateCode": "SP"
	},
	{
		"id": 3556800,
		"name": "Viradouro",
		"stateCode": "SP"
	},
	{
		"id": 3556909,
		"name": "Vista Alegre do Alto",
		"stateCode": "SP"
	},
	{
		"id": 3556958,
		"name": "Vitória Brasil",
		"stateCode": "SP"
	},
	{
		"id": 3557006,
		"name": "Votorantim",
		"stateCode": "SP"
	},
	{
		"id": 3557105,
		"name": "Votuporanga",
		"stateCode": "SP"
	},
	{
		"id": 3557154,
		"name": "Zacarias",
		"stateCode": "SP"
	},
	{
		"id": 1700251,
		"name": "Abreulândia",
		"stateCode": "TO"
	},
	{
		"id": 1700301,
		"name": "Aguiarnópolis",
		"stateCode": "TO"
	},
	{
		"id": 1700350,
		"name": "Aliança do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1700400,
		"name": "Almas",
		"stateCode": "TO"
	},
	{
		"id": 1700707,
		"name": "Alvorada",
		"stateCode": "TO"
	},
	{
		"id": 1701002,
		"name": "Ananás",
		"stateCode": "TO"
	},
	{
		"id": 1701051,
		"name": "Angico",
		"stateCode": "TO"
	},
	{
		"id": 1701101,
		"name": "Aparecida do Rio Negro",
		"stateCode": "TO"
	},
	{
		"id": 1701309,
		"name": "Aragominas",
		"stateCode": "TO"
	},
	{
		"id": 1701903,
		"name": "Araguacema",
		"stateCode": "TO"
	},
	{
		"id": 1702000,
		"name": "Araguaçu",
		"stateCode": "TO"
	},
	{
		"id": 1702109,
		"name": "Araguaína",
		"stateCode": "TO"
	},
	{
		"id": 1702158,
		"name": "Araguanã",
		"stateCode": "TO"
	},
	{
		"id": 1702208,
		"name": "Araguatins",
		"stateCode": "TO"
	},
	{
		"id": 1702307,
		"name": "Arapoema",
		"stateCode": "TO"
	},
	{
		"id": 1702406,
		"name": "Arraias",
		"stateCode": "TO"
	},
	{
		"id": 1702554,
		"name": "Augustinópolis",
		"stateCode": "TO"
	},
	{
		"id": 1702703,
		"name": "Aurora do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1702901,
		"name": "Axixá do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1703008,
		"name": "Babaçulândia",
		"stateCode": "TO"
	},
	{
		"id": 1703057,
		"name": "Bandeirantes do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1703073,
		"name": "Barra do Ouro",
		"stateCode": "TO"
	},
	{
		"id": 1703107,
		"name": "Barrolândia",
		"stateCode": "TO"
	},
	{
		"id": 1703206,
		"name": "Bernardo Sayão",
		"stateCode": "TO"
	},
	{
		"id": 1703305,
		"name": "Bom Jesus do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1703602,
		"name": "Brasilândia do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1703701,
		"name": "Brejinho de Nazaré",
		"stateCode": "TO"
	},
	{
		"id": 1703800,
		"name": "Buriti do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1703826,
		"name": "Cachoeirinha",
		"stateCode": "TO"
	},
	{
		"id": 1703842,
		"name": "Campos Lindos",
		"stateCode": "TO"
	},
	{
		"id": 1703867,
		"name": "Cariri do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1703883,
		"name": "Carmolândia",
		"stateCode": "TO"
	},
	{
		"id": 1703891,
		"name": "Carrasco Bonito",
		"stateCode": "TO"
	},
	{
		"id": 1703909,
		"name": "Caseara",
		"stateCode": "TO"
	},
	{
		"id": 1704105,
		"name": "Centenário",
		"stateCode": "TO"
	},
	{
		"id": 1705102,
		"name": "Chapada da Natividade",
		"stateCode": "TO"
	},
	{
		"id": 1704600,
		"name": "Chapada de Areia",
		"stateCode": "TO"
	},
	{
		"id": 1705508,
		"name": "Colinas do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1716703,
		"name": "Colméia",
		"stateCode": "TO"
	},
	{
		"id": 1705557,
		"name": "Combinado",
		"stateCode": "TO"
	},
	{
		"id": 1705607,
		"name": "Conceição do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1706001,
		"name": "Couto Magalhães",
		"stateCode": "TO"
	},
	{
		"id": 1706100,
		"name": "Cristalândia",
		"stateCode": "TO"
	},
	{
		"id": 1706258,
		"name": "Crixás do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1706506,
		"name": "Darcinópolis",
		"stateCode": "TO"
	},
	{
		"id": 1707009,
		"name": "Dianópolis",
		"stateCode": "TO"
	},
	{
		"id": 1707108,
		"name": "Divinópolis do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1707207,
		"name": "Dois Irmãos do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1707306,
		"name": "Dueré",
		"stateCode": "TO"
	},
	{
		"id": 1707405,
		"name": "Esperantina",
		"stateCode": "TO"
	},
	{
		"id": 1707553,
		"name": "Fátima",
		"stateCode": "TO"
	},
	{
		"id": 1707652,
		"name": "Figueirópolis",
		"stateCode": "TO"
	},
	{
		"id": 1707702,
		"name": "Filadélfia",
		"stateCode": "TO"
	},
	{
		"id": 1708205,
		"name": "Formoso do Araguaia",
		"stateCode": "TO"
	},
	{
		"id": 1708304,
		"name": "Goianorte",
		"stateCode": "TO"
	},
	{
		"id": 1709005,
		"name": "Goiatins",
		"stateCode": "TO"
	},
	{
		"id": 1709302,
		"name": "Guaraí",
		"stateCode": "TO"
	},
	{
		"id": 1709500,
		"name": "Gurupi",
		"stateCode": "TO"
	},
	{
		"id": 1709807,
		"name": "Ipueiras",
		"stateCode": "TO"
	},
	{
		"id": 1710508,
		"name": "Itacajá",
		"stateCode": "TO"
	},
	{
		"id": 1710706,
		"name": "Itaguatins",
		"stateCode": "TO"
	},
	{
		"id": 1710904,
		"name": "Itapiratins",
		"stateCode": "TO"
	},
	{
		"id": 1711100,
		"name": "Itaporã do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1711506,
		"name": "Jaú do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1711803,
		"name": "Juarina",
		"stateCode": "TO"
	},
	{
		"id": 1711902,
		"name": "Lagoa da Confusão",
		"stateCode": "TO"
	},
	{
		"id": 1711951,
		"name": "Lagoa do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1712009,
		"name": "Lajeado",
		"stateCode": "TO"
	},
	{
		"id": 1712157,
		"name": "Lavandeira",
		"stateCode": "TO"
	},
	{
		"id": 1712405,
		"name": "Lizarda",
		"stateCode": "TO"
	},
	{
		"id": 1712454,
		"name": "Luzinópolis",
		"stateCode": "TO"
	},
	{
		"id": 1712504,
		"name": "Marianópolis do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1712702,
		"name": "Mateiros",
		"stateCode": "TO"
	},
	{
		"id": 1712801,
		"name": "Maurilândia do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1713205,
		"name": "Miracema do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1713304,
		"name": "Miranorte",
		"stateCode": "TO"
	},
	{
		"id": 1713601,
		"name": "Monte do Carmo",
		"stateCode": "TO"
	},
	{
		"id": 1713700,
		"name": "Monte Santo do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1713957,
		"name": "Muricilândia",
		"stateCode": "TO"
	},
	{
		"id": 1714203,
		"name": "Natividade",
		"stateCode": "TO"
	},
	{
		"id": 1714302,
		"name": "Nazaré",
		"stateCode": "TO"
	},
	{
		"id": 1714880,
		"name": "Nova Olinda",
		"stateCode": "TO"
	},
	{
		"id": 1715002,
		"name": "Nova Rosalândia",
		"stateCode": "TO"
	},
	{
		"id": 1715101,
		"name": "Novo Acordo",
		"stateCode": "TO"
	},
	{
		"id": 1715150,
		"name": "Novo Alegre",
		"stateCode": "TO"
	},
	{
		"id": 1715259,
		"name": "Novo Jardim",
		"stateCode": "TO"
	},
	{
		"id": 1715507,
		"name": "Oliveira de Fátima",
		"stateCode": "TO"
	},
	{
		"id": 1721000,
		"name": "Palmas",
		"stateCode": "TO"
	},
	{
		"id": 1715705,
		"name": "Palmeirante",
		"stateCode": "TO"
	},
	{
		"id": 1713809,
		"name": "Palmeiras do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1715754,
		"name": "Palmeirópolis",
		"stateCode": "TO"
	},
	{
		"id": 1716109,
		"name": "Paraíso do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1716208,
		"name": "Paranã",
		"stateCode": "TO"
	},
	{
		"id": 1716307,
		"name": "Pau D'Arco",
		"stateCode": "TO"
	},
	{
		"id": 1716505,
		"name": "Pedro Afonso",
		"stateCode": "TO"
	},
	{
		"id": 1716604,
		"name": "Peixe",
		"stateCode": "TO"
	},
	{
		"id": 1716653,
		"name": "Pequizeiro",
		"stateCode": "TO"
	},
	{
		"id": 1717008,
		"name": "Pindorama do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1717206,
		"name": "Piraquê",
		"stateCode": "TO"
	},
	{
		"id": 1717503,
		"name": "Pium",
		"stateCode": "TO"
	},
	{
		"id": 1717800,
		"name": "Ponte Alta do Bom Jesus",
		"stateCode": "TO"
	},
	{
		"id": 1717909,
		"name": "Ponte Alta do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1718006,
		"name": "Porto Alegre do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1718204,
		"name": "Porto Nacional",
		"stateCode": "TO"
	},
	{
		"id": 1718303,
		"name": "Praia Norte",
		"stateCode": "TO"
	},
	{
		"id": 1718402,
		"name": "Presidente Kennedy",
		"stateCode": "TO"
	},
	{
		"id": 1718451,
		"name": "Pugmil",
		"stateCode": "TO"
	},
	{
		"id": 1718501,
		"name": "Recursolândia",
		"stateCode": "TO"
	},
	{
		"id": 1718550,
		"name": "Riachinho",
		"stateCode": "TO"
	},
	{
		"id": 1718659,
		"name": "Rio da Conceição",
		"stateCode": "TO"
	},
	{
		"id": 1718709,
		"name": "Rio dos Bois",
		"stateCode": "TO"
	},
	{
		"id": 1718758,
		"name": "Rio Sono",
		"stateCode": "TO"
	},
	{
		"id": 1718808,
		"name": "Sampaio",
		"stateCode": "TO"
	},
	{
		"id": 1718840,
		"name": "Sandolândia",
		"stateCode": "TO"
	},
	{
		"id": 1718865,
		"name": "Santa Fé do Araguaia",
		"stateCode": "TO"
	},
	{
		"id": 1718881,
		"name": "Santa Maria do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1718899,
		"name": "Santa Rita do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1718907,
		"name": "Santa Rosa do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1719004,
		"name": "Santa Tereza do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1720002,
		"name": "Santa Terezinha do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1720101,
		"name": "São Bento do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1720150,
		"name": "São Félix do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1720200,
		"name": "São Miguel do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1720259,
		"name": "São Salvador do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1720309,
		"name": "São Sebastião do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1720499,
		"name": "São Valério",
		"stateCode": "TO"
	},
	{
		"id": 1720655,
		"name": "Silvanópolis",
		"stateCode": "TO"
	},
	{
		"id": 1720804,
		"name": "Sítio Novo do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1720853,
		"name": "Sucupira",
		"stateCode": "TO"
	},
	{
		"id": 1708254,
		"name": "Tabocão",
		"stateCode": "TO"
	},
	{
		"id": 1720903,
		"name": "Taguatinga",
		"stateCode": "TO"
	},
	{
		"id": 1720937,
		"name": "Taipas do Tocantins",
		"stateCode": "TO"
	},
	{
		"id": 1720978,
		"name": "Talismã",
		"stateCode": "TO"
	},
	{
		"id": 1721109,
		"name": "Tocantínia",
		"stateCode": "TO"
	},
	{
		"id": 1721208,
		"name": "Tocantinópolis",
		"stateCode": "TO"
	},
	{
		"id": 1721257,
		"name": "Tupirama",
		"stateCode": "TO"
	},
	{
		"id": 1721307,
		"name": "Tupiratins",
		"stateCode": "TO"
	},
	{
		"id": 1722081,
		"name": "Wanderlândia",
		"stateCode": "TO"
	},
	{
		"id": 1722107,
		"name": "Xambioá",
		"stateCode": "TO"
	}
] satisfies BrazilCity[];
