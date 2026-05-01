import { PDFDocument } from 'pdf-lib';
import type { DeckGroups, UserProfile } from '../types';

export async function generateDeckListPDF(
  deckGroups: DeckGroups,
  profile: UserProfile,
  deckName: string
) {
  try {
    // Fetch the official template from our public folder
    const templateBytes = await fetch('./KDE_DeckList.pdf').then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    // Player Information
    const names = (profile.fullName || '').trim().split(' ');
    const lastName = names.length > 1 ? names.pop() : '';
    const firstName = names.join(' ');

    // Helper to set field with specific font size and ensure it's not transparent
    const setField = (name: string, text: string, fontSize: number) => {
      try {
        const field = form.getTextField(name);
        field.setText(text || '');
        field.setFontSize(fontSize);
      } catch (e) {
        console.warn(`Field not found: ${name}`);
      }
    };
    setField('First  Middle Names', firstName, 10);
    if (lastName) {
      setField('Last Names', lastName, 10);
      setField('Last Name Initial', lastName.charAt(0).toUpperCase(), 10);
    }
    setField('CARD GAME ID', profile.konamiId || '', 10);
    setField('Country of Residency', profile.residency || '', 10);
    setField('Event Name', profile.eventName || '', 9);

    const date = profile.eventDate ? new Date(profile.eventDate + 'T12:00:00') : new Date();
    // Konami form wants MM / DD / YYYY without leading zeros
    setField('Event Date - Month', (date.getMonth() + 1).toString(), 10);
    setField('Event Date - Day', date.getDate().toString(), 10);
    setField('Event Date - Year', date.getFullYear().toString(), 10);

    // Helper to fill sections with dynamic font sizing for legibility
    const fillSection = (cards: any[], prefix: string, max: number) => {
      let countFilled = 0;
      cards.forEach((card, index) => {
        if (index < max) {
          const fieldName = `${prefix} ${index + 1}`;
          const countName = `${prefix} Card ${index + 1} Count`;

          try {
            const field = form.getTextField(fieldName);
            const name = card.name || '';

            // Dynamic font size: Start at 9pt, go down to 6pt if long
            let fontSize = 9;
            if (name.length > 30) fontSize = 7.5;
            if (name.length > 40) fontSize = 6;

            field.setText(name);
            field.setFontSize(fontSize);

            // For counts, use a standard clear size
            try {
              const countField = form.getTextField(countName);
              countField.setText(card.count.toString());
              countField.setFontSize(10);
            } catch (e) {
              // Fallback for fields like "Side Deck 1 Count"
              const fallbackCountName = `${prefix} ${index + 1} Count`;
              const countField = form.getTextField(fallbackCountName);
              countField.setText(card.count.toString());
              countField.setFontSize(10);
            }

            countFilled += card.count;
          } catch (e) {
            console.warn(`Could not find field: ${fieldName}`);
          }
        }
      });
      return countFilled;
    };    // Main Deck needs to be split by type
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
