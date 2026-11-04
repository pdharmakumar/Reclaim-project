export const categories = ['Electronics', 'Clothing', 'Water bottles', 'School supplies', 'Bags', 'Jewelry and accessories', 'Keys', 'Other'];
export const pickupLocations = ['Main office', 'Lost-and-found desk', 'Library front desk'];
export const users = [
  { id: 'alex', name: 'Alex Morgan', initials: 'AM', description: 'Student · Demo account' },
  { id: 'jamie', name: 'Jamie Chen', initials: 'JC', description: 'Student · Demo account' },
  { id: 'sam', name: 'Sam Rivera', initials: 'SR', description: 'Student · Demo account' },
];
export const seedItems = [
  { id: 'headphones', title: 'Sony wireless headphones', description: 'A pair of black over-ear wireless headphones, found resting on a table near the library windows. Kept safely at the front desk. Tell me a distinguishing detail to help verify they’re yours.', category: 'Electronics', color: 'Black', brand: 'Sony', location: 'Library, second floor', date: '2026-11-02', type: 'found', photos: ['/public/headphones.jpg'], status: 'Available', creatorId: 'jamie' },
  { id: 'bottle', title: 'Sage green water bottle', description: 'Insulated sage green water bottle left after lunch. There are a couple of stickers on the other side. Describe them when you get in touch!', category: 'Water bottles', color: 'Green', brand: '', location: 'Student courtyard', date: '2026-11-01', type: 'found', photos: ['/public/bottle.jpg'], status: 'Available', creatorId: 'sam' },
  { id: 'bag', title: 'Everyday blue backpack', description: 'A well-loved blue backpack found under a bench. Contents have been left untouched. Please describe what’s inside so we can get it back to the right person.', category: 'Bags', color: 'Blue', brand: '', location: 'Arts building', date: '2026-10-31', type: 'found', photos: ['/public/bag.jpg'], status: 'Available', creatorId: 'jamie' },
  { id: 'camera', title: 'Sony digital camera', description: 'Black digital camera found after the photography club meeting. Please describe the strap and the contents of the case.', category: 'Electronics', color: 'Black', brand: 'Sony', location: 'Creative studio', date: '2026-10-30', type: 'found', photos: ['/public/camera.jpg'], status: 'Available', creatorId: 'sam' },
  { id: 'sweater', title: 'Favorite gray hoodie', description: 'I left my gray hoodie near the gym after practice. It has a tiny embroidered logo and initials on the inside label.', category: 'Clothing', color: 'Gray', brand: '', location: 'Sports center', date: '2026-10-29', type: 'lost', photos: ['/public/sweater.jpg'], status: 'Open', creatorId: 'alex' },
  { id: 'keys', title: 'Keys with a blue keychain', description: 'Two keys and a blue fabric keychain picked up on the path to the science building. Describe the text on the keychain.', category: 'Keys', color: 'Blue', brand: '', location: 'Science building', date: '2026-10-28', type: 'found', photos: [], status: 'Available', creatorId: 'alex' },
];
