import { SITE_ID } from './site.js';
import { ABERWEN } from './castle/site.js';
import { AGUZADERAS } from './aguzaderas/site.js';

// The castle on show (see site.js for how it is chosen).
export const site = SITE_ID === 'aguzaderas' ? AGUZADERAS : ABERWEN;
