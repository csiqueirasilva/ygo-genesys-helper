import { PDFDocument } from 'pdf-lib';
import type { DeckGroups, UserProfile } from '../types';

export async function generateDeckListPDF(
  deckGroups: DeckGroups,
  profile: UserProfile,
  deckName: string,
  format: 'genesys' | 'advanced'
) {
  try {
    // Fetch the official template from our public folder
    const templateBytes = await fetch('./KDE_DeckList.pdf').then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    // Player Information
    const names = profile.fullName.trim().split(' ');
    const lastName = names.length > 1 ? names.pop() : '';
    const firstName = names.join(' ');
    
    form.getTextField('First  Middle Names').setText(firstName);
    if (lastName) {
      form.getTextField('Last Names').setText(lastName);
      form.getTextField('Last Name Initial').setText(lastName.charAt(0).toUpperCase());
    }
    form.getTextField('CARD GAME ID').setText(profile.konamiId);
    
    // We can't easily set format/event name here without more fields, but we can try to put deck name somewhere
    // The official form doesn't have a "Deck Name" field usually, but let's check the list again
    // It has "Event Name". Let's use that for Deck Name + Format
    form.getTextField('Event Name').setText(`${deckName} (${format === 'genesys' ? 'Genesys' : 'Advanced'})`);

    const date = new Date();
    form.getTextField('Event Date - Month').setText((date.getMonth() + 1).toString());
    form.getTextField('Event Date - Day').setText(date.getDate().toString());
    form.getTextField('Event Date - Year').setText(date.getFullYear().toString());

    // Helper to fill sections
    const fillSection = (cards: any[], prefix: string, max: number) => {
      let countFilled = 0;
      cards.forEach((card, index) => {
        if (index < max) {
          const fieldName = `${prefix} ${index + 1}`;
          const countName = `${prefix} Card ${index + 1} Count`;

          try {
            const field = form.getTextField(fieldName);
            field.setText(card.name);
            field.setFontSize(8); // Set font size to fit long names

            const countField = form.getTextField(countName);
            countField.setText(card.count.toString());
            countField.setFontSize(9);

            countFilled += card.count;
          } catch (e) {
            // Some fields might have slightly different names (e.g. "Side Deck 1" instead of "Side Deck Card 1")
            // Based on inspection:
            // Side Deck 1, Side Deck 1 Count
            // Extra Deck 1, Extra Deck 1 Count
            try {
               const fallbackCountName = `${prefix} ${index + 1} Count`;
               const countField = form.getTextField(fallbackCountName);
               countField.setText(card.count.toString());
               countField.setFontSize(9);
            } catch(e2) {
               console.warn(`Could not find field: ${fieldName} or ${countName}`);
            }
          }
        }
      });
      return countFilled;
    };

    // Main Deck needs to be split by type
    const monsters = deckGroups.main.filter(c => (c.type || '').toLowerCase().includes('monster'));
    const spells = deckGroups.main.filter(c => (c.type || '').toLowerCase().includes('spell'));
    const traps = deckGroups.main.filter(c => (c.type || '').toLowerCase().includes('trap'));

    fillSection(monsters, 'Monster', 18);
    fillSection(spells, 'Spell', 18);
    fillSection(traps, 'Trap', 18);

    form.getTextField('Main Deck Total').setText(deckGroups.main.reduce((s, c) => s + c.count, 0).toString());
    form.getTextField('Total Monster Cards').setText(monsters.reduce((s, c) => s + c.count, 0).toString());
    form.getTextField('Total Spell Cards').setText(spells.reduce((s, c) => s + c.count, 0).toString());
    form.getTextField('Total Trap Cards').setText(traps.reduce((s, c) => s + c.count, 0).toString());

    // Extra and Side
    fillSection(deckGroups.extra, 'Extra Deck', 15);
    fillSection(deckGroups.side, 'Side Deck', 15);
    
    form.getTextField('Total Extra Deck').setText(deckGroups.extra.reduce((s, c) => s + c.count, 0).toString());
    form.getTextField('Total Side Deck').setText(deckGroups.side.reduce((s, c) => s + c.count, 0).toString());

    const pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: true });
    const link = document.createElement('a');
    link.href = pdfBase64;
    link.download = `${deckName.replace(/\s+/g, '_')}_official_decklist.pdf`;
    link.click();

  } catch (error) {
    console.error('Failed to generate official PDF', error);
    alert('Failed to generate official PDF. Check console for details.');
  }
}
