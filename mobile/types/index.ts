export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  styleProfile?: StyleProfile;
}

export interface StyleProfile {
  faceShape?: FaceShape;
  undertone?: Undertone;
  contrastLevel?: ContrastLevel;
  colorPalette?: string[];
  hairTexture?: HairTexture;
  aesthetics?: string[];
}

export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'oblong' | 'diamond';
export type Undertone = 'warm' | 'cool' | 'neutral';
export type ContrastLevel = 'low' | 'medium' | 'high';
export type HairTexture = 'straight' | 'wavy' | 'curly' | 'coily';

export type AnalysisStatus = 'processing' | 'complete' | 'failed';

export interface AnalysisResult {
  id: string;
  userId: string;
  imageUrl: string;
  createdAt: string;
  // Upload returns a `processing` row; analysis blocks are absent until the
  // backend job finishes, so poll until this is `complete` or `failed`.
  status: AnalysisStatus;
  errorMessage?: string | null;
  faceAnalysis?: FaceAnalysis;
  colorAnalysis?: ColorAnalysis;
  hairAnalysis?: HairAnalysis;
  bodyAnalysis?: BodyAnalysis;
  skinAnalysis?: SkinAnalysis;
  quality?: ImageQuality;
  recommendations: Recommendation[];
}

export interface ImageQuality {
  overall: 'good' | 'fair' | 'poor';
  faceFound: boolean;
  poseComplete: boolean;
  flags: string[];
  metrics: { blur: number; brightness: number; faceAngle: 'frontal' | 'slight' | 'profile' | null };
}

export interface SkinAnalysis {
  texture: 'smooth' | 'normal' | 'textured' | 'unknown';
  evenness: number;
  redness: 'low' | 'medium' | 'high' | 'unknown';
  underEye: 'bright' | 'neutral' | 'dark' | 'unknown';
  oiliness: 'matte' | 'normal' | 'shiny' | 'unknown';
  concerns: string[];
  quality: { faceFound: boolean; lightingOk: boolean };
}

export interface FaceAnalysis {
  shape: FaceShape;
  landmarks: Landmark[];
  proportions: FaceProportions;
  harmony: number;
  overallScore?: number;
  featureScores?: FacialFeatureScores;
  canon?: FacialCanon;
  eyebrow?: EyebrowMap;
}

export interface EyebrowMap {
  currentArchPosition: number;
  idealArchPosition: number;
  shape: 'flat' | 'soft arch' | 'high arch' | 'rounded';
  guidance: string;
}

export interface FacialFeatureScores {
  symmetry?: number;
  eyes?: number;
  eyebrows?: number;
  nose?: number;
  lips?: number;
  jawline?: number;
  cheekbones?: number;
  chin?: number;
  forehead?: number;
  skinQuality?: number;
}

export interface FacialCanon {
  facialThirds?: number;
  goldenRatio?: number;
  eyeSpacing?: number;
  lipRatio?: number;
  jawAngle?: number;
}

export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export interface FaceProportions {
  faceLength: number;
  faceWidth: number;
  jawWidth: number;
  foreheadWidth: number;
  ratio: number;
}

export interface ColorAnalysis {
  skinUndertone: Undertone;
  skinColor: string;
  hairColor?: string;
  eyeColor?: string;
  contrastLevel: ContrastLevel;
  palette: ColorPalette;
  seasonal?: SeasonalColor;
  bestColors?: ColorSwatch[];
  avoidColors?: ColorSwatch[];
  makeup?: MakeupRecommendation;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type SeasonSubtype = 'light' | 'true' | 'soft' | 'deep' | 'warm' | 'cool' | 'bright';

export interface SeasonalColor {
  season: Season;
  subtype: SeasonSubtype;
  label: string;
  depth: 'light' | 'medium' | 'deep';
  complexion: string;
  description?: string;
}

export interface ColorSwatch {
  hex: string;
  name?: string;
  category?: 'neutral' | 'accent' | 'statement' | 'avoid';
}

export interface MakeupRecommendation {
  lipColors: ColorSwatch[];
  eyeShadows: ColorSwatch[];
  blushes: ColorSwatch[];
  notes?: string[];
}

export interface ColorPalette {
  primary: string[];
  accent: string[];
  neutral: string[];
  avoid: string[];
}

export interface HairAnalysis {
  texture: HairTexture | 'unknown';
  thickness?: 'fine' | 'medium' | 'thick' | 'unknown';
  length?: 'short' | 'medium' | 'long' | 'unknown';
  color?: string | null;
  density?: 'fine' | 'medium' | 'thick';
  recommendedStyles: (string | HairstyleRecommendation)[];
}

export interface HairstyleRecommendation {
  id: string;
  name: string;
  type: 'lob' | 'curtain' | 'waves' | 'pixie' | 'bun' | 'layers' | 'bangs';
  suitabilityScore: number;
  description: string;
  previewUrl?: string;
}

export type BodyShape = 'hourglass' | 'pear' | 'apple' | 'rectangle' | 'inverted_triangle';

export interface BodyAnalysis {
  shape: BodyShape | null;
  proportions: BodyProportions;
  styleRecommendations?: string[];
  posture?: BodyPosture;
  guidance?: BodyGuidance;
}

export interface BodyPosture {
  shoulderTilt: number;
  level: 'even' | 'slight' | 'tilted';
  headLean: 'centered' | 'leaning right' | 'leaning left';
}

export interface BodyGuidance {
  balance: string;
  emphasize: string[];
  soften: string[];
  fitNotes: string[];
}

// Matches backend body_analysis.py output (ratios, not raw widths).
export interface BodyProportions {
  shoulderToHip?: number;
  waistToHip?: number | null;
  legToTorso?: number;
}

export type RecommendationCategory = 'hair' | 'hairstyle' | 'color' | 'outfit' | 'aesthetic' | 'accessory';

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  description?: string;
  imageUrl?: string;
  confidence: number;
  suitabilityScore?: number;
  tags?: string[];
  items?: (string | RecommendationItem)[];
}

export interface RecommendationItem {
  id: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  price?: number;
  affiliateUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  analysisContext?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// ---- goal-first onboarding / Vibe Profile / Action Plan ----

export interface OnboardingAnswers {
  primaryGoal?: string | null;
  areasOfInterest?: string[] | null;
  budgetRange?: string | null;
  market?: string | null;
  climate?: string | null;
  climateConsent?: boolean;
  skinSensitivities?: string[] | null;
  declaredAllergies?: string[] | null;
  hairTextureReported?: string | null;
  hairTreatmentHistory?: string[] | null;
  currentRoutine?: string | null;
  stylePreferences?: string[] | null;
  maintenanceTolerance?: string | null;
  timeAvailable?: string | null;
  keepUsingItems?: string | null;
  genderPresentation?: string | null;
  modestyPreference?: string | null;
  skippedFields?: string[] | null;
}

export interface OnboardingRecord extends OnboardingAnswers {
  id: string;
  userId: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ConfidenceLabel =
  | 'high' | 'usable_with_caution' | 'retake_recommended'
  | 'self_reported' | 'user_corrected' | 'unknown';

export type AttributeSource = 'scan' | 'questionnaire' | 'user_correction' | 'rules' | 'none';

export interface VibeAttribute {
  value: unknown;
  originalValue?: unknown;
  confidence: ConfidenceLabel;
  source: AttributeSource;
  updatedAt?: string | null;
  explanation: string;
  limitations?: string | null;
}

export interface VibeProfile {
  userId: string;
  goal?: string | null;
  areasOfInterest: string[];
  constraints: Record<string, unknown>;
  attributes: Record<string, VibeAttribute>;
  hasScan: boolean;
  hasOnboarding: boolean;
  lastScanAt?: string | null;
}

export interface ProfileCorrection {
  id: string;
  attributeKey: string;
  correctedValue: unknown;
  note?: string | null;
  createdAt: string;
}

export type ActionFeedbackType =
  | 'saved' | 'completed' | 'helpful' | 'not_relevant' | 'too_expensive'
  | 'unavailable' | 'too_much_maintenance' | 'irritation' | 'prefer_another';

export interface PlanAction {
  id: string;
  rank: number;
  category: string;
  title: string;
  why: string;
  confidenceLabel: string;
  limitations?: string | null;
  isAvoid: boolean;
  items?: unknown[] | null;
  feedback: string[];
}

export interface ActionPlan {
  goal?: string | null;
  topActions: PlanAction[];
  avoid: PlanAction[];
  checkInAt: string;
  generatedAt: string;
  profileComplete: boolean;
  limitationsSummary?: string | null;
}
