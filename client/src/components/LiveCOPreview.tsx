import { Document, Page, Text, View, StyleSheet, PDFViewer, Font } from '@react-pdf/renderer';
import type { ChangeOrderManifest, ManifestCategorySummary } from '@shared/types';

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
  },
  header: {
    marginBottom: 15,
    borderBottom: '2px solid #03512A',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#03512A',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 100,
    fontWeight: 'bold',
  },
  infoValue: {
    flex: 1,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#03512A',
    color: 'white',
    padding: 4,
    marginBottom: 4,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    fontWeight: 'bold',
    padding: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    padding: 4,
  },
  colDesc: { width: '40%' },
  colClass: { width: '15%' },
  colQty: { width: '10%', textAlign: 'right' },
  colUnit: { width: '10%', textAlign: 'center' },
  colRate: { width: '12%', textAlign: 'right' },
  colAmount: { width: '13%', textAlign: 'right' },
  subtotalRow: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: '#f9f9f9',
  },
  markupRow: {
    flexDirection: 'row',
    padding: 4,
  },
  categoryTotalRow: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: '#e8f5e9',
    fontWeight: 'bold',
  },
  totalsSection: {
    marginTop: 15,
    borderTopWidth: 2,
    borderColor: '#03512A',
    paddingTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  totalLabel: {
    width: 150,
    textAlign: 'right',
    paddingRight: 10,
  },
  totalValue: {
    width: 100,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: '#03512A',
    color: 'white',
    padding: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    width: 150,
    textAlign: 'right',
    paddingRight: 10,
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    width: 100,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 'bold',
  },
  signatureBlock: {
    marginTop: 25,
    paddingTop: 15,
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  signatureRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 40,
  },
  signatureLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    paddingBottom: 20,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#666',
    marginTop: 4,
  },
  draftWatermark: {
    position: 'absolute',
    top: '40%',
    left: '20%',
    fontSize: 72,
    color: 'rgba(0, 0, 0, 0.05)',
    transform: 'rotate(-35deg)',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
  },
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function CategorySection({ category, title }: { category: ManifestCategorySummary; title: string }) {
  if (category.items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colClass}>Classification</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colUnit}>Unit</Text>
          <Text style={styles.colRate}>Rate</Text>
          <Text style={styles.colAmount}>Amount</Text>
        </View>
        {category.items.map((item, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.colClass}>{item.classification || '-'}</Text>
            <Text style={styles.colQty}>{item.quantity.toFixed(2)}</Text>
            <Text style={styles.colUnit}>{item.unit}</Text>
            <Text style={styles.colRate}>{formatCurrency(item.unitRate)}</Text>
            <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
          </View>
        ))}
        <View style={styles.subtotalRow}>
          <Text style={[styles.colDesc, { fontWeight: 'bold' }]}>Subtotal</Text>
          <Text style={styles.colClass}></Text>
          <Text style={styles.colQty}></Text>
          <Text style={styles.colUnit}></Text>
          <Text style={styles.colRate}></Text>
          <Text style={[styles.colAmount, { fontWeight: 'bold' }]}>{formatCurrency(category.subtotal)}</Text>
        </View>
        {category.markupPercent > 0 && (
          <>
            <View style={styles.markupRow}>
              <Text style={[styles.colDesc]}>Markup ({category.markupPercent}%)</Text>
              <Text style={styles.colClass}></Text>
              <Text style={styles.colQty}></Text>
              <Text style={styles.colUnit}></Text>
              <Text style={styles.colRate}></Text>
              <Text style={styles.colAmount}>{formatCurrency(category.markupAmount)}</Text>
            </View>
            <View style={styles.categoryTotalRow}>
              <Text style={styles.colDesc}>Category Total</Text>
              <Text style={styles.colClass}></Text>
              <Text style={styles.colQty}></Text>
              <Text style={styles.colUnit}></Text>
              <Text style={styles.colRate}></Text>
              <Text style={styles.colAmount}>{formatCurrency(category.categoryTotal)}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function ChangeOrderDocument({ manifest }: { manifest: ChangeOrderManifest }) {
  const isDraft = manifest.header.status === 'draft';

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {isDraft && <Text style={styles.draftWatermark}>DRAFT</Text>}

        <View style={styles.header}>
          <Text style={styles.title}>REQUEST FOR CHANGE</Text>
          <Text style={styles.subtitle}>Change Order #{manifest.header.coNumber || 'TBD'}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Project:</Text>
            <Text style={styles.infoValue}>{manifest.header.projectName} ({manifest.header.projectNumber})</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Client:</Text>
            <Text style={styles.infoValue}>{manifest.header.clientName || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{manifest.header.preparedDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.infoValue}>{manifest.header.status.toUpperCase()}</Text>
          </View>
          {manifest.header.scope && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Scope:</Text>
              <Text style={styles.infoValue}>{manifest.header.scope}</Text>
            </View>
          )}
          {manifest.header.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Description:</Text>
              <Text style={styles.infoValue}>{manifest.header.description}</Text>
            </View>
          )}
        </View>

        <CategorySection category={manifest.categories.labor} title="LABOR" />
        <CategorySection category={manifest.categories.equipment} title="EQUIPMENT" />
        <CategorySection category={manifest.categories.materials} title="MATERIALS" />
        <CategorySection category={manifest.categories.subcontractors} title="SUBCONTRACTORS" />
        <CategorySection category={manifest.categories.disposal} title="DISPOSAL" />
        <CategorySection category={manifest.categories.import} title="IMPORT / TRUCKING" />

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Direct Costs Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(manifest.totals.grandSubtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Markup:</Text>
            <Text style={styles.totalValue}>{formatCurrency(manifest.totals.grandMarkup)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>GRAND TOTAL:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(manifest.totals.grandTotal)}</Text>
          </View>
        </View>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>Prepared By / Date</Text>
            </View>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>Approved By / Date</Text>
            </View>
          </View>
          <View style={styles.signatureRow}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>Client Approval / Date</Text>
            </View>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>Project Manager / Date</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          {manifest.signatureBlock.preparedByName || 'Resource Environmental Inc.'} | Generated {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  );
}

interface LiveCOPreviewProps {
  manifest: ChangeOrderManifest | null;
  isLoading?: boolean;
}

export default function LiveCOPreview({ manifest, isLoading }: LiveCOPreviewProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800" data-testid="preview-loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Generating preview...</p>
        </div>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800" data-testid="preview-empty">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">No Change Order Preview</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Start building your change order using the AI assistant to see a live preview here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full" data-testid="live-co-preview">
      <PDFViewer width="100%" height="100%" showToolbar={true}>
        <ChangeOrderDocument manifest={manifest} />
      </PDFViewer>
    </div>
  );
}

export function PreviewSummaryCard({ manifest }: { manifest: ChangeOrderManifest }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4" data-testid="preview-summary">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            CO #{manifest.header.coNumber || 'Draft'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {manifest.header.projectName}
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          manifest.header.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
          manifest.header.status === 'pending' ? 'bg-blue-100 text-blue-800' :
          manifest.header.status === 'approved' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {manifest.header.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Labor:</span>
          <span className="font-medium">{formatCurrency(manifest.categories.labor.categoryTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Equipment:</span>
          <span className="font-medium">{formatCurrency(manifest.categories.equipment.categoryTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Materials:</span>
          <span className="font-medium">{formatCurrency(manifest.categories.materials.categoryTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Subcontractors:</span>
          <span className="font-medium">{formatCurrency(manifest.categories.subcontractors.categoryTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Disposal:</span>
          <span className="font-medium">{formatCurrency(manifest.categories.disposal.categoryTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Import:</span>
          <span className="font-medium">{formatCurrency(manifest.categories.import.categoryTotal)}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="flex justify-between text-base font-bold">
          <span>Grand Total:</span>
          <span className="text-green-700 dark:text-green-400" data-testid="grand-total">
            {formatCurrency(manifest.totals.grandTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
