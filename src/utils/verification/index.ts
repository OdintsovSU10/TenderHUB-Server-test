/**
 * Экспорт модуля верификации расчетов
 */

export {
  runMarkupVerification,
  logVerificationResults,
  formatVerificationMessage,
  type VerificationResult,
  type VerificationFailure
} from './markupVerifier';

export {
  verifyWithServer,
  batchVerifyWithServer,
  logServerVerificationResult,
  type ServerVerificationResult
} from './serverVerification';

export {
  verifyFinancialIndicators,
  logFinancialVerificationResults,
  formatFinancialVerificationMessage,
  type FinancialVerificationResult,
  type IndicatorComparison
} from './financialVerification';
