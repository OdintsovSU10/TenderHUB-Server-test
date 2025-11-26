# Upload BOQ Modal - Refactored Architecture

## Overview
The UploadBOQModal has been refactored from a single 647-line component into a modular architecture with separate concerns.

## File Structure

```
src/pages/Admin/Tenders/
├── UploadBOQModal.tsx         # Main modal component (172 lines)
├── hooks/
│   ├── useBoqUpload.ts        # Business logic hook (297 lines)
│   └── index.ts               # Barrel export
└── components/
    ├── UploadStep.tsx         # Step 1: Upload UI (82 lines)
    ├── MappingStep.tsx        # Step 2: Unit mapping UI (178 lines)
    ├── PreviewStep.tsx        # Step 3: Validation & progress UI (81 lines)
    └── index.ts               # Barrel export
```

## Component Responsibilities

### UploadBOQModal.tsx
Main orchestrator component that:
- Manages modal open/close state
- Coordinates between child components
- Handles database operations (unit creation)
- Manages file upload trigger and cleanup

**Props:**
- `visible: boolean` - Modal visibility
- `tenderId: string` - Target tender ID
- `tenderName: string` - Display name
- `onCancel: () => void` - Close callback
- `onSuccess: () => void` - Success callback

**Size:** 172 lines

### hooks/useBoqUpload.ts
Custom React hook containing all business logic:
- Excel file parsing (XLSX)
- Data validation
- Unit existence checking
- Unit mapping management
- Database upload with batch processing

**Exported Types:**
- `ParsedRow` - Parsed Excel row structure
- `ValidationResult` - Validation output
- `ExistingUnit` - Database unit definition
- `UnitMapping` - Unit mapping configuration

**Hook API:**
```typescript
const {
  parsedData,           // Parsed Excel rows
  validationResult,     // Validation result object
  uploadProgress,       // Upload progress (0-100)
  existingUnits,        // Available units from DB
  unitMappings,         // Unit mapping configurations
  uploading,            // Is uploading flag
  fetchExistingUnits,   // Load units from DB
  parseExcelFile,       // Parse Excel file
  handleMappingChange,  // Update unit mapping
  isReadyForUpload,     // Check if ready
  uploadData,           // Upload to database
  reset,                // Clear state
} = useBoqUpload();
```

**Size:** 297 lines

### components/UploadStep.tsx
UI component for Step 1 - File upload:
- Drag-and-drop file uploader
- Tender information display
- Format instructions

**Props:**
- `fileList: UploadFile[]` - Selected files
- `onFileUpload: (file: File) => boolean` - Upload handler
- `onRemove: () => void` - Remove handler
- `uploading: boolean` - Disable during upload
- `tenderName: string` - Display tender name

**Size:** 82 lines

### components/MappingStep.tsx
UI component for Step 2 - Unit mapping:
- Displays unknown units from validation
- Maps units to existing or creates new ones
- Form for creating new units

**Props:**
- `unitMappings: UnitMapping[]` - Mappings to display
- `existingUnits: ExistingUnit[]` - Available units
- `unknownUnitsCount: number` - Count for header
- `onMappingChange` - Update mapping handler
- `onCreateUnit` - Create new unit handler

**Size:** 178 lines

### components/PreviewStep.tsx
UI component for Step 3 - Validation & progress:
- Shows validation results (success/errors)
- Displays upload progress bar
- Lists errors and warnings

**Props:**
- `validationResult: ValidationResult | null` - Validation data
- `parsedDataCount: number` - Item count
- `uploadProgress: number` - Progress percentage
- `uploading: boolean` - Is uploading flag

**Size:** 81 lines

## Data Flow

```
1. User selects Excel file
         ↓
2. UploadStep triggers parseExcelFile()
         ↓
3. useBoqUpload parses and validates
         ↓
4. PreviewStep shows results
         ↓
5. If validation fails → User fixes file
6. If unknown units → MappingStep handles mapping
         ↓
7. User clicks "Upload"
         ↓
8. uploadData() processes batch upload
         ↓
9. Success → onSuccess() callback → Modal closes
```

## Key Features

### Excel Parsing
- Reads first sheet from Excel file
- Extracts 6 columns: item_no, hierarchy_level, work_name, unit_code, volume, client_note
- Filters empty rows automatically

### Validation
- Required fields: work_name
- Checks for unknown units (triggers MappingStep if found)
- Validates volume is positive number
- Validates hierarchy_level is valid number

### Unit Mapping
- Maps unknown units to existing ones
- Or creates new units on-the-fly
- Updates form with new units automatically

### Batch Upload
- Uploads in batches of 100 records
- Shows progress indicator
- Handles errors gracefully
- Cleans up state on completion

## Usage Example

```tsx
import UploadBOQModal from '@/pages/Admin/Tenders/UploadBOQModal';

export function TenderPage() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [tenderId, setTenderId] = useState('');

  return (
    <>
      <Button onClick={() => setUploadModalOpen(true)}>
        Upload BOQ
      </Button>

      <UploadBOQModal
        visible={uploadModalOpen}
        tenderId={tenderId}
        tenderName="Project A"
        onCancel={() => setUploadModalOpen(false)}
        onSuccess={() => {
          setUploadModalOpen(false);
          // Refresh data
        }}
      />
    </>
  );
}
```

## Development Notes

### File Size Compliance
All files are under the 600-line limit:
- UploadBOQModal: 172 lines ✓
- useBoqUpload: 297 lines ✓
- UploadStep: 82 lines ✓
- MappingStep: 178 lines ✓
- PreviewStep: 81 lines ✓

### TypeScript
- Strict mode enabled
- All types properly defined
- No implicit `any`

### Dependencies
- React 18.3.1
- Ant Design 5.28.0
- XLSX 0.18.5
- Supabase 2.80.0

## Testing Recommendations

### Unit Tests (for useBoqUpload)
- Test Excel parsing with various formats
- Test validation with invalid data
- Test unit mapping logic
- Test batch upload process

### Component Tests
- Test UploadStep file selection
- Test MappingStep UI interactions
- Test PreviewStep error display
- Test modal close functionality

### Integration Tests
- Full upload flow with real Excel files
- Database operations
- Error handling scenarios
