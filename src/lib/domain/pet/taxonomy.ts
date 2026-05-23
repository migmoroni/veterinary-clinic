import type { TranslationKey } from '$lib/i18n/index.js';

const knownPetSpeciesIds = ['canine', 'feline'] as const;

export type KnownPetSpecies = (typeof knownPetSpeciesIds)[number];
export type PetSpecies = KnownPetSpecies | (string & {});

export interface PetSpeciesOption {
	id: KnownPetSpecies;
	labelKey: TranslationKey;
	imagePath: string;
	fallbackImagePath: string;
}

interface PetBreedOptionBase {
	id: string;
	species: KnownPetSpecies;
	labelKey: TranslationKey;
	imagePath: string;
	fallbackImagePath: string;
}

const canineBreedFallback = '/images/pet-taxonomy/breeds/canine-placeholder.svg';
const felineBreedFallback = '/images/pet-taxonomy/breeds/feline-placeholder.svg';

function breedImage(id: string): string {
	return `/images/pet-taxonomy/breeds/${id}.webp`;
}

export const petSpeciesOptions = [
	{
		id: 'canine',
		labelKey: 'pet.speciesCanine',
		imagePath: '/images/pet-taxonomy/species/canine.webp',
		fallbackImagePath: '/images/pet-taxonomy/species/canine.svg'
	},
	{
		id: 'feline',
		labelKey: 'pet.speciesFeline',
		imagePath: '/images/pet-taxonomy/species/feline.webp',
		fallbackImagePath: '/images/pet-taxonomy/species/feline.svg'
	}
] as const satisfies readonly PetSpeciesOption[];

export const petBreedOptions = [
	{ id: 'mixed-breed', species: 'canine', labelKey: 'pet.breed.mixedBreed', imagePath: breedImage('mixed-breed'), fallbackImagePath: canineBreedFallback },
	{ id: 'shih-tzu', species: 'canine', labelKey: 'pet.breed.shihTzu', imagePath: breedImage('shih-tzu'), fallbackImagePath: canineBreedFallback },
	{ id: 'poodle', species: 'canine', labelKey: 'pet.breed.poodle', imagePath: breedImage('poodle'), fallbackImagePath: canineBreedFallback },
	{ id: 'pinscher', species: 'canine', labelKey: 'pet.breed.pinscher', imagePath: breedImage('pinscher'), fallbackImagePath: canineBreedFallback },
	{ id: 'pit-bull', species: 'canine', labelKey: 'pet.breed.pitBull', imagePath: breedImage('pit-bull'), fallbackImagePath: canineBreedFallback },
	{ id: 'lhasa-apso', species: 'canine', labelKey: 'pet.breed.lhasaApso', imagePath: breedImage('lhasa-apso'), fallbackImagePath: canineBreedFallback },
	{ id: 'dachshund', species: 'canine', labelKey: 'pet.breed.dachshund', imagePath: breedImage('dachshund'), fallbackImagePath: canineBreedFallback },
	{ id: 'rottweiler', species: 'canine', labelKey: 'pet.breed.rottweiler', imagePath: breedImage('rottweiler'), fallbackImagePath: canineBreedFallback },
	{ id: 'labrador-retriever', species: 'canine', labelKey: 'pet.breed.labradorRetriever', imagePath: breedImage('labrador-retriever'), fallbackImagePath: canineBreedFallback },
	{ id: 'yorkshire-terrier', species: 'canine', labelKey: 'pet.breed.yorkshireTerrier', imagePath: breedImage('yorkshire-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'german-shepherd', species: 'canine', labelKey: 'pet.breed.germanShepherd', imagePath: breedImage('german-shepherd'), fallbackImagePath: canineBreedFallback },
	{ id: 'chow-chow', species: 'canine', labelKey: 'pet.breed.chowChow', imagePath: breedImage('chow-chow'), fallbackImagePath: canineBreedFallback },
	{ id: 'pug', species: 'canine', labelKey: 'pet.breed.pug', imagePath: breedImage('pug'), fallbackImagePath: canineBreedFallback },
	{ id: 'maltese', species: 'canine', labelKey: 'pet.breed.maltese', imagePath: breedImage('maltese'), fallbackImagePath: canineBreedFallback },
	{ id: 'border-collie', species: 'canine', labelKey: 'pet.breed.borderCollie', imagePath: breedImage('border-collie'), fallbackImagePath: canineBreedFallback },
	{ id: 'golden-retriever', species: 'canine', labelKey: 'pet.breed.goldenRetriever', imagePath: breedImage('golden-retriever'), fallbackImagePath: canineBreedFallback },
	{ id: 'australian-cattle-dog', species: 'canine', labelKey: 'pet.breed.australianCattleDog', imagePath: breedImage('australian-cattle-dog'), fallbackImagePath: canineBreedFallback },
	{ id: 'boxer', species: 'canine', labelKey: 'pet.breed.boxer', imagePath: breedImage('boxer'), fallbackImagePath: canineBreedFallback },
	{ id: 'brazilian-terrier', species: 'canine', labelKey: 'pet.breed.brazilianTerrier', imagePath: breedImage('brazilian-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'cocker-spaniel', species: 'canine', labelKey: 'pet.breed.cockerSpaniel', imagePath: breedImage('cocker-spaniel'), fallbackImagePath: canineBreedFallback },
	{ id: 'german-spitz', species: 'canine', labelKey: 'pet.breed.germanSpitz', imagePath: breedImage('german-spitz'), fallbackImagePath: canineBreedFallback },
	{ id: 'pekingese', species: 'canine', labelKey: 'pet.breed.pekingese', imagePath: breedImage('pekingese'), fallbackImagePath: canineBreedFallback },
	{ id: 'fila-brasileiro', species: 'canine', labelKey: 'pet.breed.filaBrasileiro', imagePath: breedImage('fila-brasileiro'), fallbackImagePath: canineBreedFallback },
	{ id: 'american-bully', species: 'canine', labelKey: 'pet.breed.americanBully', imagePath: breedImage('american-bully'), fallbackImagePath: canineBreedFallback },
	{ id: 'french-bulldog', species: 'canine', labelKey: 'pet.breed.frenchBulldog', imagePath: breedImage('french-bulldog'), fallbackImagePath: canineBreedFallback },
	{ id: 'american-foxhound', species: 'canine', labelKey: 'pet.breed.americanFoxhound', imagePath: breedImage('american-foxhound'), fallbackImagePath: canineBreedFallback },
	{ id: 'siberian-husky', species: 'canine', labelKey: 'pet.breed.siberianHusky', imagePath: breedImage('siberian-husky'), fallbackImagePath: canineBreedFallback },
	{ id: 'shar-pei', species: 'canine', labelKey: 'pet.breed.sharPei', imagePath: breedImage('shar-pei'), fallbackImagePath: canineBreedFallback },
	{ id: 'beagle', species: 'canine', labelKey: 'pet.breed.beagle', imagePath: breedImage('beagle'), fallbackImagePath: canineBreedFallback },
	{ id: 'dalmatian', species: 'canine', labelKey: 'pet.breed.dalmatian', imagePath: breedImage('dalmatian'), fallbackImagePath: canineBreedFallback },
	{ id: 'schnauzer', species: 'canine', labelKey: 'pet.breed.schnauzer', imagePath: breedImage('schnauzer'), fallbackImagePath: canineBreedFallback },
	{ id: 'belgian-shepherd', species: 'canine', labelKey: 'pet.breed.belgianShepherd', imagePath: breedImage('belgian-shepherd'), fallbackImagePath: canineBreedFallback },
	{ id: 'english-bulldog', species: 'canine', labelKey: 'pet.breed.englishBulldog', imagePath: breedImage('english-bulldog'), fallbackImagePath: canineBreedFallback },
	{ id: 'akita', species: 'canine', labelKey: 'pet.breed.akita', imagePath: breedImage('akita'), fallbackImagePath: canineBreedFallback },
	{ id: 'australian-shepherd', species: 'canine', labelKey: 'pet.breed.australianShepherd', imagePath: breedImage('australian-shepherd'), fallbackImagePath: canineBreedFallback },
	{ id: 'basset-hound', species: 'canine', labelKey: 'pet.breed.bassetHound', imagePath: breedImage('basset-hound'), fallbackImagePath: canineBreedFallback },
	{ id: 'bernese-mountain-dog', species: 'canine', labelKey: 'pet.breed.berneseMountainDog', imagePath: breedImage('bernese-mountain-dog'), fallbackImagePath: canineBreedFallback },
	{ id: 'boston-terrier', species: 'canine', labelKey: 'pet.breed.bostonTerrier', imagePath: breedImage('boston-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'cane-corso', species: 'canine', labelKey: 'pet.breed.caneCorso', imagePath: breedImage('cane-corso'), fallbackImagePath: canineBreedFallback },
	{ id: 'chihuahua', species: 'canine', labelKey: 'pet.breed.chihuahua', imagePath: breedImage('chihuahua'), fallbackImagePath: canineBreedFallback },
	{ id: 'doberman', species: 'canine', labelKey: 'pet.breed.doberman', imagePath: breedImage('doberman'), fallbackImagePath: canineBreedFallback },
	{ id: 'great-dane', species: 'canine', labelKey: 'pet.breed.greatDane', imagePath: breedImage('great-dane'), fallbackImagePath: canineBreedFallback },
	{ id: 'jack-russell-terrier', species: 'canine', labelKey: 'pet.breed.jackRussellTerrier', imagePath: breedImage('jack-russell-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'samoyed', species: 'canine', labelKey: 'pet.breed.samoyed', imagePath: breedImage('samoyed'), fallbackImagePath: canineBreedFallback },
	{ id: 'weimaraner', species: 'canine', labelKey: 'pet.breed.weimaraner', imagePath: breedImage('weimaraner'), fallbackImagePath: canineBreedFallback },
	{ id: 'affenpinscher', species: 'canine', labelKey: 'pet.breed.affenpinscher', imagePath: breedImage('affenpinscher'), fallbackImagePath: canineBreedFallback },
	{ id: 'afghan-hound', species: 'canine', labelKey: 'pet.breed.afghanHound', imagePath: breedImage('afghan-hound'), fallbackImagePath: canineBreedFallback },
	{ id: 'airedale-terrier', species: 'canine', labelKey: 'pet.breed.airedaleTerrier', imagePath: breedImage('airedale-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'basenji', species: 'canine', labelKey: 'pet.breed.basenji', imagePath: breedImage('basenji'), fallbackImagePath: canineBreedFallback },
	{ id: 'bichon-frise', species: 'canine', labelKey: 'pet.breed.bichonFrise', imagePath: breedImage('bichon-frise'), fallbackImagePath: canineBreedFallback },
	{ id: 'bloodhound', species: 'canine', labelKey: 'pet.breed.bloodhound', imagePath: breedImage('bloodhound'), fallbackImagePath: canineBreedFallback },
	{ id: 'borzoi', species: 'canine', labelKey: 'pet.breed.borzoi', imagePath: breedImage('borzoi'), fallbackImagePath: canineBreedFallback },
	{ id: 'bull-terrier', species: 'canine', labelKey: 'pet.breed.bullTerrier', imagePath: breedImage('bull-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'bullmastiff', species: 'canine', labelKey: 'pet.breed.bullmastiff', imagePath: breedImage('bullmastiff'), fallbackImagePath: canineBreedFallback },
	{ id: 'cavalier-king-charles-spaniel', species: 'canine', labelKey: 'pet.breed.cavalierKingCharlesSpaniel', imagePath: breedImage('cavalier-king-charles-spaniel'), fallbackImagePath: canineBreedFallback },
	{ id: 'collie', species: 'canine', labelKey: 'pet.breed.collie', imagePath: breedImage('collie'), fallbackImagePath: canineBreedFallback },
	{ id: 'coton-de-tulear', species: 'canine', labelKey: 'pet.breed.cotonDeTulear', imagePath: breedImage('coton-de-tulear'), fallbackImagePath: canineBreedFallback },
	{ id: 'dogo-argentino', species: 'canine', labelKey: 'pet.breed.dogoArgentino', imagePath: breedImage('dogo-argentino'), fallbackImagePath: canineBreedFallback },
	{ id: 'dogue-de-bordeaux', species: 'canine', labelKey: 'pet.breed.dogueDeBordeaux', imagePath: breedImage('dogue-de-bordeaux'), fallbackImagePath: canineBreedFallback },
	{ id: 'english-setter', species: 'canine', labelKey: 'pet.breed.englishSetter', imagePath: breedImage('english-setter'), fallbackImagePath: canineBreedFallback },
	{ id: 'fox-terrier', species: 'canine', labelKey: 'pet.breed.foxTerrier', imagePath: breedImage('fox-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'greyhound', species: 'canine', labelKey: 'pet.breed.greyhound', imagePath: breedImage('greyhound'), fallbackImagePath: canineBreedFallback },
	{ id: 'havanese', species: 'canine', labelKey: 'pet.breed.havanese', imagePath: breedImage('havanese'), fallbackImagePath: canineBreedFallback },
	{ id: 'irish-setter', species: 'canine', labelKey: 'pet.breed.irishSetter', imagePath: breedImage('irish-setter'), fallbackImagePath: canineBreedFallback },
	{ id: 'italian-greyhound', species: 'canine', labelKey: 'pet.breed.italianGreyhound', imagePath: breedImage('italian-greyhound'), fallbackImagePath: canineBreedFallback },
	{ id: 'japanese-spitz', species: 'canine', labelKey: 'pet.breed.japaneseSpitz', imagePath: breedImage('japanese-spitz'), fallbackImagePath: canineBreedFallback },
	{ id: 'mastiff', species: 'canine', labelKey: 'pet.breed.mastiff', imagePath: breedImage('mastiff'), fallbackImagePath: canineBreedFallback },
	{ id: 'papillon', species: 'canine', labelKey: 'pet.breed.papillon', imagePath: breedImage('papillon'), fallbackImagePath: canineBreedFallback },
	{ id: 'pembroke-welsh-corgi', species: 'canine', labelKey: 'pet.breed.pembrokeWelshCorgi', imagePath: breedImage('pembroke-welsh-corgi'), fallbackImagePath: canineBreedFallback },
	{ id: 'pointer', species: 'canine', labelKey: 'pet.breed.pointer', imagePath: breedImage('pointer'), fallbackImagePath: canineBreedFallback },
	{ id: 'portuguese-water-dog', species: 'canine', labelKey: 'pet.breed.portugueseWaterDog', imagePath: breedImage('portuguese-water-dog'), fallbackImagePath: canineBreedFallback },
	{ id: 'saint-bernard', species: 'canine', labelKey: 'pet.breed.saintBernard', imagePath: breedImage('saint-bernard'), fallbackImagePath: canineBreedFallback },
	{ id: 'shetland-sheepdog', species: 'canine', labelKey: 'pet.breed.shetlandSheepdog', imagePath: breedImage('shetland-sheepdog'), fallbackImagePath: canineBreedFallback },
	{ id: 'shiba-inu', species: 'canine', labelKey: 'pet.breed.shibaInu', imagePath: breedImage('shiba-inu'), fallbackImagePath: canineBreedFallback },
	{ id: 'whippet', species: 'canine', labelKey: 'pet.breed.whippet', imagePath: breedImage('whippet'), fallbackImagePath: canineBreedFallback },
	{ id: 'alaskan-malamute', species: 'canine', labelKey: 'pet.breed.alaskanMalamute', imagePath: breedImage('alaskan-malamute'), fallbackImagePath: canineBreedFallback },
	{ id: 'anatolian-shepherd-dog', species: 'canine', labelKey: 'pet.breed.anatolianShepherdDog', imagePath: breedImage('anatolian-shepherd-dog'), fallbackImagePath: canineBreedFallback },
	{ id: 'barbet', species: 'canine', labelKey: 'pet.breed.barbet', imagePath: breedImage('barbet'), fallbackImagePath: canineBreedFallback },
	{ id: 'beauceron', species: 'canine', labelKey: 'pet.breed.beauceron', imagePath: breedImage('beauceron'), fallbackImagePath: canineBreedFallback },
	{ id: 'belgian-malinois', species: 'canine', labelKey: 'pet.breed.belgianMalinois', imagePath: breedImage('belgian-malinois'), fallbackImagePath: canineBreedFallback },
	{ id: 'biewer-terrier', species: 'canine', labelKey: 'pet.breed.biewerTerrier', imagePath: breedImage('biewer-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'black-russian-terrier', species: 'canine', labelKey: 'pet.breed.blackRussianTerrier', imagePath: breedImage('black-russian-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'boerboel', species: 'canine', labelKey: 'pet.breed.boerboel', imagePath: breedImage('boerboel'), fallbackImagePath: canineBreedFallback },
	{ id: 'briard', species: 'canine', labelKey: 'pet.breed.briard', imagePath: breedImage('briard'), fallbackImagePath: canineBreedFallback },
	{ id: 'brussels-griffon', species: 'canine', labelKey: 'pet.breed.brusselsGriffon', imagePath: breedImage('brussels-griffon'), fallbackImagePath: canineBreedFallback },
	{ id: 'cardigan-welsh-corgi', species: 'canine', labelKey: 'pet.breed.cardiganWelshCorgi', imagePath: breedImage('cardigan-welsh-corgi'), fallbackImagePath: canineBreedFallback },
	{ id: 'chesapeake-bay-retriever', species: 'canine', labelKey: 'pet.breed.chesapeakeBayRetriever', imagePath: breedImage('chesapeake-bay-retriever'), fallbackImagePath: canineBreedFallback },
	{ id: 'chinese-crested', species: 'canine', labelKey: 'pet.breed.chineseCrested', imagePath: breedImage('chinese-crested'), fallbackImagePath: canineBreedFallback },
	{ id: 'clumber-spaniel', species: 'canine', labelKey: 'pet.breed.clumberSpaniel', imagePath: breedImage('clumber-spaniel'), fallbackImagePath: canineBreedFallback },
	{ id: 'curly-coated-retriever', species: 'canine', labelKey: 'pet.breed.curlyCoatedRetriever', imagePath: breedImage('curly-coated-retriever'), fallbackImagePath: canineBreedFallback },
	{ id: 'english-cocker-spaniel', species: 'canine', labelKey: 'pet.breed.englishCockerSpaniel', imagePath: breedImage('english-cocker-spaniel'), fallbackImagePath: canineBreedFallback },
	{ id: 'english-springer-spaniel', species: 'canine', labelKey: 'pet.breed.englishSpringerSpaniel', imagePath: breedImage('english-springer-spaniel'), fallbackImagePath: canineBreedFallback },
	{ id: 'flat-coated-retriever', species: 'canine', labelKey: 'pet.breed.flatCoatedRetriever', imagePath: breedImage('flat-coated-retriever'), fallbackImagePath: canineBreedFallback },
	{ id: 'gordon-setter', species: 'canine', labelKey: 'pet.breed.gordonSetter', imagePath: breedImage('gordon-setter'), fallbackImagePath: canineBreedFallback },
	{ id: 'irish-wolfhound', species: 'canine', labelKey: 'pet.breed.irishWolfhound', imagePath: breedImage('irish-wolfhound'), fallbackImagePath: canineBreedFallback },
	{ id: 'keeshond', species: 'canine', labelKey: 'pet.breed.keeshond', imagePath: breedImage('keeshond'), fallbackImagePath: canineBreedFallback },
	{ id: 'komondor', species: 'canine', labelKey: 'pet.breed.komondor', imagePath: breedImage('komondor'), fallbackImagePath: canineBreedFallback },
	{ id: 'kuvasz', species: 'canine', labelKey: 'pet.breed.kuvasz', imagePath: breedImage('kuvasz'), fallbackImagePath: canineBreedFallback },
	{ id: 'leonberger', species: 'canine', labelKey: 'pet.breed.leonberger', imagePath: breedImage('leonberger'), fallbackImagePath: canineBreedFallback },
	{ id: 'miniature-pinscher', species: 'canine', labelKey: 'pet.breed.miniaturePinscher', imagePath: breedImage('miniature-pinscher'), fallbackImagePath: canineBreedFallback },
	{ id: 'newfoundland', species: 'canine', labelKey: 'pet.breed.newfoundland', imagePath: breedImage('newfoundland'), fallbackImagePath: canineBreedFallback },
	{ id: 'norfolk-terrier', species: 'canine', labelKey: 'pet.breed.norfolkTerrier', imagePath: breedImage('norfolk-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'norwich-terrier', species: 'canine', labelKey: 'pet.breed.norwichTerrier', imagePath: breedImage('norwich-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'old-english-sheepdog', species: 'canine', labelKey: 'pet.breed.oldEnglishSheepdog', imagePath: breedImage('old-english-sheepdog'), fallbackImagePath: canineBreedFallback },
	{ id: 'pomeranian', species: 'canine', labelKey: 'pet.breed.pomeranian', imagePath: breedImage('pomeranian'), fallbackImagePath: canineBreedFallback },
	{ id: 'rhodesian-ridgeback', species: 'canine', labelKey: 'pet.breed.rhodesianRidgeback', imagePath: breedImage('rhodesian-ridgeback'), fallbackImagePath: canineBreedFallback },
	{ id: 'saluki', species: 'canine', labelKey: 'pet.breed.saluki', imagePath: breedImage('saluki'), fallbackImagePath: canineBreedFallback },
	{ id: 'scottish-terrier', species: 'canine', labelKey: 'pet.breed.scottishTerrier', imagePath: breedImage('scottish-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'staffordshire-bull-terrier', species: 'canine', labelKey: 'pet.breed.staffordshireBullTerrier', imagePath: breedImage('staffordshire-bull-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'west-highland-white-terrier', species: 'canine', labelKey: 'pet.breed.westHighlandWhiteTerrier', imagePath: breedImage('west-highland-white-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'brazilian-pit-monster', species: 'canine', labelKey: 'pet.breed.brazilianPitMonster', imagePath: breedImage('brazilian-pit-monster'), fallbackImagePath: canineBreedFallback },
	{ id: 'gaucho-sheepdog', species: 'canine', labelKey: 'pet.breed.gauchoSheepdog', imagePath: breedImage('gaucho-sheepdog'), fallbackImagePath: canineBreedFallback },
	{ id: 'dogo-brasileiro', species: 'canine', labelKey: 'pet.breed.dogoBrasileiro', imagePath: breedImage('dogo-brasileiro'), fallbackImagePath: canineBreedFallback },
	{ id: 'campeiro-bulldog', species: 'canine', labelKey: 'pet.breed.campeiroBulldog', imagePath: breedImage('campeiro-bulldog'), fallbackImagePath: canineBreedFallback },
	{ id: 'rastreador-brasileiro', species: 'canine', labelKey: 'pet.breed.rastreadorBrasileiro', imagePath: breedImage('rastreador-brasileiro'), fallbackImagePath: canineBreedFallback },
	{ id: 'veadeiro-pampeano', species: 'canine', labelKey: 'pet.breed.veadeiroPampeano', imagePath: breedImage('veadeiro-pampeano'), fallbackImagePath: canineBreedFallback },
	{ id: 'pastor-da-mantiqueira', species: 'canine', labelKey: 'pet.breed.pastorDaMantiqueira', imagePath: breedImage('pastor-da-mantiqueira'), fallbackImagePath: canineBreedFallback },
	{ id: 'american-staffordshire-terrier', species: 'canine', labelKey: 'pet.breed.americanStaffordshireTerrier', imagePath: breedImage('american-staffordshire-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'american-bulldog', species: 'canine', labelKey: 'pet.breed.americanBulldog', imagePath: breedImage('american-bulldog'), fallbackImagePath: canineBreedFallback },
	{ id: 'olde-english-bulldogge', species: 'canine', labelKey: 'pet.breed.oldeEnglishBulldogge', imagePath: breedImage('olde-english-bulldogge'), fallbackImagePath: canineBreedFallback },
	{ id: 'presa-canario', species: 'canine', labelKey: 'pet.breed.presaCanario', imagePath: breedImage('presa-canario'), fallbackImagePath: canineBreedFallback },
	{ id: 'catahoula-leopard-dog', species: 'canine', labelKey: 'pet.breed.catahoulaLeopardDog', imagePath: breedImage('catahoula-leopard-dog'), fallbackImagePath: canineBreedFallback },
	{ id: 'carolina-dog', species: 'canine', labelKey: 'pet.breed.carolinaDog', imagePath: breedImage('carolina-dog'), fallbackImagePath: canineBreedFallback },
	{ id: 'rat-terrier', species: 'canine', labelKey: 'pet.breed.ratTerrier', imagePath: breedImage('rat-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'toy-fox-terrier', species: 'canine', labelKey: 'pet.breed.toyFoxTerrier', imagePath: breedImage('toy-fox-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'american-eskimo-dog', species: 'canine', labelKey: 'pet.breed.americanEskimoDog', imagePath: breedImage('american-eskimo-dog'), fallbackImagePath: canineBreedFallback },
	{ id: 'miniature-american-shepherd', species: 'canine', labelKey: 'pet.breed.miniatureAmericanShepherd', imagePath: breedImage('miniature-american-shepherd'), fallbackImagePath: canineBreedFallback },
	{ id: 'boykin-spaniel', species: 'canine', labelKey: 'pet.breed.boykinSpaniel', imagePath: breedImage('boykin-spaniel'), fallbackImagePath: canineBreedFallback },
	{ id: 'american-water-spaniel', species: 'canine', labelKey: 'pet.breed.americanWaterSpaniel', imagePath: breedImage('american-water-spaniel'), fallbackImagePath: canineBreedFallback },
	{ id: 'black-and-tan-coonhound', species: 'canine', labelKey: 'pet.breed.blackAndTanCoonhound', imagePath: breedImage('black-and-tan-coonhound'), fallbackImagePath: canineBreedFallback },
	{ id: 'bluetick-coonhound', species: 'canine', labelKey: 'pet.breed.bluetickCoonhound', imagePath: breedImage('bluetick-coonhound'), fallbackImagePath: canineBreedFallback },
	{ id: 'redbone-coonhound', species: 'canine', labelKey: 'pet.breed.redboneCoonhound', imagePath: breedImage('redbone-coonhound'), fallbackImagePath: canineBreedFallback },
	{ id: 'treeing-walker-coonhound', species: 'canine', labelKey: 'pet.breed.treeingWalkerCoonhound', imagePath: breedImage('treeing-walker-coonhound'), fallbackImagePath: canineBreedFallback },
	{ id: 'plott-hound', species: 'canine', labelKey: 'pet.breed.plottHound', imagePath: breedImage('plott-hound'), fallbackImagePath: canineBreedFallback },
	{ id: 'nova-scotia-duck-tolling-retriever', species: 'canine', labelKey: 'pet.breed.novaScotiaDuckTollingRetriever', imagePath: breedImage('nova-scotia-duck-tolling-retriever'), fallbackImagePath: canineBreedFallback },
	{ id: 'canadian-eskimo-dog', species: 'canine', labelKey: 'pet.breed.canadianEskimoDog', imagePath: breedImage('canadian-eskimo-dog'), fallbackImagePath: canineBreedFallback },
	{ id: 'chinook', species: 'canine', labelKey: 'pet.breed.chinook', imagePath: breedImage('chinook'), fallbackImagePath: canineBreedFallback },
	{ id: 'xoloitzcuintli', species: 'canine', labelKey: 'pet.breed.xoloitzcuintli', imagePath: breedImage('xoloitzcuintli'), fallbackImagePath: canineBreedFallback },
	{ id: 'peruvian-inca-orchid', species: 'canine', labelKey: 'pet.breed.peruvianIncaOrchid', imagePath: breedImage('peruvian-inca-orchid'), fallbackImagePath: canineBreedFallback },
	{ id: 'chilean-terrier', species: 'canine', labelKey: 'pet.breed.chileanTerrier', imagePath: breedImage('chilean-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'cimarron-uruguayo', species: 'canine', labelKey: 'pet.breed.cimarronUruguayo', imagePath: breedImage('cimarron-uruguayo'), fallbackImagePath: canineBreedFallback },
	{ id: 'mucuchies', species: 'canine', labelKey: 'pet.breed.mucuchies', imagePath: breedImage('mucuchies'), fallbackImagePath: canineBreedFallback },
	{ id: 'gran-mastin-de-borinquen', species: 'canine', labelKey: 'pet.breed.granMastinDeBorinquen', imagePath: breedImage('gran-mastin-de-borinquen'), fallbackImagePath: canineBreedFallback },
	{ id: 'argentine-pila-dog', species: 'canine', labelKey: 'pet.breed.argentinePilaDog', imagePath: breedImage('argentine-pila-dog'), fallbackImagePath: canineBreedFallback },
	{ id: 'alaskan-klee-kai', species: 'canine', labelKey: 'pet.breed.alaskanKleeKai', imagePath: breedImage('alaskan-klee-kai'), fallbackImagePath: canineBreedFallback },
	{ id: 'dutch-shepherd', species: 'canine', labelKey: 'pet.breed.dutchShepherd', imagePath: breedImage('dutch-shepherd'), fallbackImagePath: canineBreedFallback },
	{ id: 'great-pyrenees', species: 'canine', labelKey: 'pet.breed.greatPyrenees', imagePath: breedImage('great-pyrenees'), fallbackImagePath: canineBreedFallback },
	{ id: 'german-shorthaired-pointer', species: 'canine', labelKey: 'pet.breed.germanShorthairedPointer', imagePath: breedImage('german-shorthaired-pointer'), fallbackImagePath: canineBreedFallback },
	{ id: 'vizsla', species: 'canine', labelKey: 'pet.breed.vizsla', imagePath: breedImage('vizsla'), fallbackImagePath: canineBreedFallback },
	{ id: 'brittany', species: 'canine', labelKey: 'pet.breed.brittany', imagePath: breedImage('brittany'), fallbackImagePath: canineBreedFallback },
	{ id: 'german-wirehaired-pointer', species: 'canine', labelKey: 'pet.breed.germanWirehairedPointer', imagePath: breedImage('german-wirehaired-pointer'), fallbackImagePath: canineBreedFallback },
	{ id: 'wirehaired-pointing-griffon', species: 'canine', labelKey: 'pet.breed.wirehairedPointingGriffon', imagePath: breedImage('wirehaired-pointing-griffon'), fallbackImagePath: canineBreedFallback },
	{ id: 'tibetan-mastiff', species: 'canine', labelKey: 'pet.breed.tibetanMastiff', imagePath: breedImage('tibetan-mastiff'), fallbackImagePath: canineBreedFallback },
	{ id: 'maremma-sheepdog', species: 'canine', labelKey: 'pet.breed.maremmaSheepdog', imagePath: breedImage('maremma-sheepdog'), fallbackImagePath: canineBreedFallback },
	{ id: 'caucasian-shepherd-dog', species: 'canine', labelKey: 'pet.breed.caucasianShepherdDog', imagePath: breedImage('caucasian-shepherd-dog'), fallbackImagePath: canineBreedFallback },
	{ id: 'kangal-shepherd-dog', species: 'canine', labelKey: 'pet.breed.kangalShepherdDog', imagePath: breedImage('kangal-shepherd-dog'), fallbackImagePath: canineBreedFallback },
	{ id: 'labradoodle', species: 'canine', labelKey: 'pet.breed.labradoodle', imagePath: breedImage('labradoodle'), fallbackImagePath: canineBreedFallback },
	{ id: 'goldendoodle', species: 'canine', labelKey: 'pet.breed.goldendoodle', imagePath: breedImage('goldendoodle'), fallbackImagePath: canineBreedFallback },
	{ id: 'cockapoo', species: 'canine', labelKey: 'pet.breed.cockapoo', imagePath: breedImage('cockapoo'), fallbackImagePath: canineBreedFallback },
	{ id: 'cavapoo', species: 'canine', labelKey: 'pet.breed.cavapoo', imagePath: breedImage('cavapoo'), fallbackImagePath: canineBreedFallback },
	{ id: 'feline-mixed-breed', species: 'feline', labelKey: 'pet.breed.felineMixedBreed', imagePath: breedImage('feline-mixed-breed'), fallbackImagePath: felineBreedFallback },
	{ id: 'siamese', species: 'feline', labelKey: 'pet.breed.siamese', imagePath: breedImage('siamese'), fallbackImagePath: felineBreedFallback },
	{ id: 'persian', species: 'feline', labelKey: 'pet.breed.persian', imagePath: breedImage('persian'), fallbackImagePath: felineBreedFallback },
	{ id: 'abyssinian', species: 'feline', labelKey: 'pet.breed.abyssinian', imagePath: breedImage('abyssinian'), fallbackImagePath: felineBreedFallback },
	{ id: 'angora', species: 'feline', labelKey: 'pet.breed.angora', imagePath: breedImage('angora'), fallbackImagePath: felineBreedFallback },
	{ id: 'bengal', species: 'feline', labelKey: 'pet.breed.bengal', imagePath: breedImage('bengal'), fallbackImagePath: felineBreedFallback },
	{ id: 'brazilian-shorthair', species: 'feline', labelKey: 'pet.breed.brazilianShorthair', imagePath: breedImage('brazilian-shorthair'), fallbackImagePath: felineBreedFallback },
	{ id: 'british-shorthair', species: 'feline', labelKey: 'pet.breed.britishShorthair', imagePath: breedImage('british-shorthair'), fallbackImagePath: felineBreedFallback },
	{ id: 'burmese', species: 'feline', labelKey: 'pet.breed.burmese', imagePath: breedImage('burmese'), fallbackImagePath: felineBreedFallback },
	{ id: 'exotic-shorthair', species: 'feline', labelKey: 'pet.breed.exoticShorthair', imagePath: breedImage('exotic-shorthair'), fallbackImagePath: felineBreedFallback },
	{ id: 'himalayan', species: 'feline', labelKey: 'pet.breed.himalayan', imagePath: breedImage('himalayan'), fallbackImagePath: felineBreedFallback },
	{ id: 'maine-coon', species: 'feline', labelKey: 'pet.breed.maineCoon', imagePath: breedImage('maine-coon'), fallbackImagePath: felineBreedFallback },
	{ id: 'ragdoll', species: 'feline', labelKey: 'pet.breed.ragdoll', imagePath: breedImage('ragdoll'), fallbackImagePath: felineBreedFallback },
	{ id: 'russian-blue', species: 'feline', labelKey: 'pet.breed.russianBlue', imagePath: breedImage('russian-blue'), fallbackImagePath: felineBreedFallback },
	{ id: 'sacred-birman', species: 'feline', labelKey: 'pet.breed.sacredBirman', imagePath: breedImage('sacred-birman'), fallbackImagePath: felineBreedFallback },
	{ id: 'scottish-fold', species: 'feline', labelKey: 'pet.breed.scottishFold', imagePath: breedImage('scottish-fold'), fallbackImagePath: felineBreedFallback },
	{ id: 'sphynx', species: 'feline', labelKey: 'pet.breed.sphynx', imagePath: breedImage('sphynx'), fallbackImagePath: felineBreedFallback },
	{ id: 'american-shorthair', species: 'feline', labelKey: 'pet.breed.americanShorthair', imagePath: breedImage('american-shorthair'), fallbackImagePath: felineBreedFallback },
	{ id: 'balinese', species: 'feline', labelKey: 'pet.breed.balinese', imagePath: breedImage('balinese'), fallbackImagePath: felineBreedFallback },
	{ id: 'cornish-rex', species: 'feline', labelKey: 'pet.breed.cornishRex', imagePath: breedImage('cornish-rex'), fallbackImagePath: felineBreedFallback },
	{ id: 'devon-rex', species: 'feline', labelKey: 'pet.breed.devonRex', imagePath: breedImage('devon-rex'), fallbackImagePath: felineBreedFallback },
	{ id: 'egyptian-mau', species: 'feline', labelKey: 'pet.breed.egyptianMau', imagePath: breedImage('egyptian-mau'), fallbackImagePath: felineBreedFallback },
	{ id: 'manx', species: 'feline', labelKey: 'pet.breed.manx', imagePath: breedImage('manx'), fallbackImagePath: felineBreedFallback },
	{ id: 'norwegian-forest-cat', species: 'feline', labelKey: 'pet.breed.norwegianForestCat', imagePath: breedImage('norwegian-forest-cat'), fallbackImagePath: felineBreedFallback },
	{ id: 'oriental-shorthair', species: 'feline', labelKey: 'pet.breed.orientalShorthair', imagePath: breedImage('oriental-shorthair'), fallbackImagePath: felineBreedFallback },
	{ id: 'savannah', species: 'feline', labelKey: 'pet.breed.savannah', imagePath: breedImage('savannah'), fallbackImagePath: felineBreedFallback },
	{ id: 'somali', species: 'feline', labelKey: 'pet.breed.somali', imagePath: breedImage('somali'), fallbackImagePath: felineBreedFallback },
	{ id: 'chartreux', species: 'feline', labelKey: 'pet.breed.chartreux', imagePath: breedImage('chartreux'), fallbackImagePath: felineBreedFallback },
	{ id: 'european-shorthair', species: 'feline', labelKey: 'pet.breed.europeanShorthair', imagePath: breedImage('european-shorthair'), fallbackImagePath: felineBreedFallback },
	{ id: 'japanese-bobtail', species: 'feline', labelKey: 'pet.breed.japaneseBobtail', imagePath: breedImage('japanese-bobtail'), fallbackImagePath: felineBreedFallback },
	{ id: 'korat', species: 'feline', labelKey: 'pet.breed.korat', imagePath: breedImage('korat'), fallbackImagePath: felineBreedFallback },
	{ id: 'laperm', species: 'feline', labelKey: 'pet.breed.laperm', imagePath: breedImage('laperm'), fallbackImagePath: felineBreedFallback },
	{ id: 'munchkin', species: 'feline', labelKey: 'pet.breed.munchkin', imagePath: breedImage('munchkin'), fallbackImagePath: felineBreedFallback },
	{ id: 'nebelung', species: 'feline', labelKey: 'pet.breed.nebelung', imagePath: breedImage('nebelung'), fallbackImagePath: felineBreedFallback },
	{ id: 'ocicat', species: 'feline', labelKey: 'pet.breed.ocicat', imagePath: breedImage('ocicat'), fallbackImagePath: felineBreedFallback },
	{ id: 'peterbald', species: 'feline', labelKey: 'pet.breed.peterbald', imagePath: breedImage('peterbald'), fallbackImagePath: felineBreedFallback },
	{ id: 'pixie-bob', species: 'feline', labelKey: 'pet.breed.pixieBob', imagePath: breedImage('pixie-bob'), fallbackImagePath: felineBreedFallback },
	{ id: 'selkirk-rex', species: 'feline', labelKey: 'pet.breed.selkirkRex', imagePath: breedImage('selkirk-rex'), fallbackImagePath: felineBreedFallback },
	{ id: 'siberian-cat', species: 'feline', labelKey: 'pet.breed.siberianCat', imagePath: breedImage('siberian-cat'), fallbackImagePath: felineBreedFallback },
	{ id: 'singapura', species: 'feline', labelKey: 'pet.breed.singapura', imagePath: breedImage('singapura'), fallbackImagePath: felineBreedFallback },
	{ id: 'snowshoe', species: 'feline', labelKey: 'pet.breed.snowshoe', imagePath: breedImage('snowshoe'), fallbackImagePath: felineBreedFallback },
	{ id: 'tonkinese', species: 'feline', labelKey: 'pet.breed.tonkinese', imagePath: breedImage('tonkinese'), fallbackImagePath: felineBreedFallback }
] as const satisfies readonly PetBreedOptionBase[];

export type KnownPetBreed = (typeof petBreedOptions)[number]['id'];
export type PetBreed = KnownPetBreed | (string & {});
export type PetBreedOption = (typeof petBreedOptions)[number];

const petSpeciesIds = new Set<string>(petSpeciesOptions.map((option) => option.id));
const petBreedIds = new Set<string>(petBreedOptions.map((option) => option.id));

export function isPetSpecies(value: string | null | undefined): value is KnownPetSpecies {
	return petSpeciesIds.has(value ?? '');
}

export function isPetBreed(value: string | null | undefined): value is KnownPetBreed {
	return petBreedIds.has(value ?? '');
}

export function getPetSpeciesOption(species: string | null | undefined): PetSpeciesOption | null {
	return petSpeciesOptions.find((option) => option.id === species) ?? null;
}

export function getPetBreedOption(breed: string | null | undefined): PetBreedOption | null {
	return petBreedOptions.find((option) => option.id === breed) ?? null;
}

export function getPetBreedOptions(species: string | null | undefined): PetBreedOption[] {
	if (!species) return [];
	return petBreedOptions.filter((option) => option.species === species);
}

export function isPetBreedForSpecies(species: string, breed: string): boolean {
	return getPetBreedOptions(species).some((option) => option.id === breed);
}