import { ACTIVE_INGREDIENT_TYPES, stringifyActiveIngredientType } from '@vet/types/domain/active-ingredient/catalog.js';
import { CONDITION_TYPES, stringifyConditionType } from '@vet/types/domain/condition/catalog.js';
import { MANUFACTURER_TYPES, stringifyManufacturerType } from '@vet/types/domain/manufacturer/catalog.js';
import { PRODUCT_TYPES, stringifyProductType } from '@vet/types/domain/product/catalog.js';
import { quoteSqlString } from './sql-utils.js';

export const PRODUCT_TYPE_SQL_VALUES = PRODUCT_TYPES.map((type) => quoteSqlString(stringifyProductType(type))).join(', ');
export const MANUFACTURER_TYPE_SQL_VALUES = MANUFACTURER_TYPES.map((type) => quoteSqlString(stringifyManufacturerType(type))).join(', ');
export const ACTIVE_INGREDIENT_TYPE_SQL_VALUES = ACTIVE_INGREDIENT_TYPES.map((type) => quoteSqlString(stringifyActiveIngredientType(type))).join(', ');
export const CONDITION_TYPE_SQL_VALUES = CONDITION_TYPES.map((type) => quoteSqlString(stringifyConditionType(type))).join(', ');

