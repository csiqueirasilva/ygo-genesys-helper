import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { DeckGroups, UserProfile } from '../types';

export function generateDeckListPDF(
  deckGroups: DeckGroups,
  profile: UserProfile,
  deckName: string,
  format: 'genesys' | 'advanced'
) {
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(20);
  doc.text('DECK REGISTRATION SHEET', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Player Name: ${profile.fullName || '____________________'}`, 20, 35);
  doc.text(`Konami Player ID: ${profile.konamiId || '____________________'}`, 120, 35);
  doc.text(`Deck Name: ${deckName || 'Untitled Deck'}`, 20, 45);
  doc.text(`Format: ${format === 'genesys' ? 'Genesys' : 'Advanced (TCG)'}`, 120, 45);

  let currentY = 55;

  const renderSection = (title: string, cards: any[], count: number) => {
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(40, 40, 40);
    doc.rect(20, currentY, pageWidth - 40, 8, 'F');
    doc.text(`${title} (${count} Cards)`, 25, currentY + 6);
    currentY += 10;

    const tableData = cards.map(c => [c.count.toString(), c.name]);
    
    doc.autoTable({
      startY: currentY,
      head: [['Qty', 'Card Name']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [80, 80, 80] },
      margin: { left: 20, right: 20 },
      didDrawPage: (data: any) => {
        currentY = data.cursor.y;
      }
    });
    
    currentY += 5;
  };

  const mainCount = deckGroups.main.reduce((s, c) => s + c.count, 0);
  const extraCount = deckGroups.extra.reduce((s, c) => s + c.count, 0);
  const sideCount = deckGroups.side.reduce((s, c) => s + c.count, 0);

  renderSection('Main Deck', deckGroups.main, mainCount);
  
  if (currentY > 200) { doc.addPage(); currentY = 20; }
  renderSection('Extra Deck', deckGroups.extra, extraCount);
  
  if (currentY > 200) { doc.addPage(); currentY = 20; }
  renderSection('Side Deck', deckGroups.side, sideCount);

  doc.save(`${deckName.replace(/\s+/g, '_')}_decklist.pdf`);
}
