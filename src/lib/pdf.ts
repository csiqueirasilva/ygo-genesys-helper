import { PDFDocument, rgb } from 'pdf-lib';
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
    const page = pdfDoc.getPages()[0];

    // Player Information
    const names = (profile.fullName || '').trim().split(' ');
    const lastName = names.length > 1 ? names.pop() : '';
    const firstName = names.join(' ');
    
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
      setField('Last Name Initial', lastName.charAt(0).toUpperCase(), 22);
    }
    setField('CARD GAME ID', profile.konamiId || '', 10);
    setField('Country of Residency', profile.residency || '', 10);
    setField('Event Name', profile.eventName || '', 9);

    const date = profile.eventDate ? new Date(profile.eventDate + 'T12:00:00') : new Date();
    
    // Date: 05 / 08 / 2026
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString();

    const dateFields = [
      { name: 'Event Date - Month', val: month },
      { name: 'Event Date - Day', val: day },
      { name: 'Event Date - Year', val: year }
    ];

    dateFields.forEach(df => {
      try {
        const field = form.getTextField(df.name);
        const widgets = field.acroField.getWidgets();
        widgets.forEach((widget) => {
          const rect = widget.getRectangle();
          // Draw a smaller rectangle to avoid overlapping the original form borders
          // Reduced width by 6px (3px each side) and height by 4px (2px each side)
          page.drawRectangle({
            x: rect.x + 3,
            y: rect.y + 2,
            width: rect.width - 6,
            height: rect.height - 4,
            color: rgb(1, 1, 1),
          });
        });
        field.setText(df.val);
        field.setFontSize(10);
      } catch (e) {}
    });

    // Helper to fill sections with exact field names
    const fillList = (cards: any[], namePrefix: string, countPrefix: string, max: number) => {
      cards.forEach((card, index) => {
        if (index < max) {
          const num = index + 1;
          const fieldName = `${namePrefix} ${num}`;
          const countName = `${countPrefix} ${num} Count`;
          
          try {
            const field = form.getTextField(fieldName);
            const name = card.name || '';
            let fontSize = 10;
            if (name.length > 25) fontSize = 8.5;
            if (name.length > 35) fontSize = 7.5;
            if (name.length > 45) fontSize = 6.5;
            
            field.setText(name);
            field.setFontSize(fontSize);
            
            const countField = form.getTextField(countName);
            countField.setText(card.count.toString());
            countField.setFontSize(10);
          } catch (e) {
            console.warn(`Missing field: ${fieldName} or ${countName}`);
          }
        }
      });
    };

    // Main Deck split
    const monsters = deckGroups.main.filter(c => (c.type || '').toLowerCase().includes('monster'));
    const spells = deckGroups.main.filter(c => (c.type || '').toLowerCase().includes('spell'));
    const traps = deckGroups.main.filter(c => (c.type || '').toLowerCase().includes('trap'));

    fillList(monsters, 'Monster', 'Monster Card', 18);
    fillList(spells, 'Spell', 'Spell Card', 18);
    fillList(traps, 'Trap', 'Trap Card', 18);

    setField('Main Deck Total', deckGroups.main.reduce((s, c) => s + c.count, 0).toString(), 22);
    setField('Total Monster Cards', monsters.reduce((s, c) => s + c.count, 0).toString(), 10);
    setField('Total Spell Cards', spells.reduce((s, c) => s + c.count, 0).toString(), 10);
    setField('Total Trap Cards', traps.reduce((s, c) => s + c.count, 0).toString(), 10);

    // Extra and Side
    fillList(deckGroups.extra, 'Extra Deck', 'Extra Deck', 15);
    fillList(deckGroups.side, 'Side Deck', 'Side Deck', 15);
    
    setField('Total Extra Deck', deckGroups.extra.reduce((s, c) => s + c.count, 0).toString(), 10);
    setField('Total Side Deck', deckGroups.side.reduce((s, c) => s + c.count, 0).toString(), 10);

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
