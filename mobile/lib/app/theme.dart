import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design system SMHIT — §12 du cahier des charges.
/// Orange SMHIT en accent, base neutre claire, coins arrondis généreux,
/// ombres douces multi-couches, typographie Sora (titres) / Inter (corps).
class SmhitColors {
  static const brand = Color(0xFFF26A21);
  static const brand600 = Color(0xFFD2551A);
  static const brandLight = Color(0xFFFFF1E6);
  static const ink = Color(0xFF0F172A);
  static const muted = Color(0xFF64748B);
  static const bg = Color(0xFFF8FAFC);
  static const surface = Color(0xFFFFFFFF);
  static const success = Color(0xFF16A34A);
  static const warning = Color(0xFFF59E0B);
  static const danger = Color(0xFFDC2626);
  static const border = Color(0xFFE7EAF0);

  static const brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF8A3D), brand, brand600],
  );

  static const bgGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFFFF8F2), bg, bg],
  );
}

const double smhitRadius = 20.0;
const double smhitRadiusSm = 14.0;

/// Ombre douce "premium" à deux couches (portée large + contact), plutôt
/// qu'une simple `elevation` Material par défaut.
List<BoxShadow> smhitShadow({double opacity = 1}) => [
      BoxShadow(color: SmhitColors.ink.withValues(alpha: 0.06 * opacity), blurRadius: 24, offset: const Offset(0, 12)),
      BoxShadow(color: SmhitColors.ink.withValues(alpha: 0.04 * opacity), blurRadius: 4, offset: const Offset(0, 2)),
    ];

List<BoxShadow> smhitBrandShadow() => [
      BoxShadow(color: SmhitColors.brand.withValues(alpha: 0.35), blurRadius: 20, offset: const Offset(0, 8)),
    ];

ThemeData buildSmhitTheme() {
  final textTheme = GoogleFonts.interTextTheme().copyWith(
    displayLarge: GoogleFonts.sora(fontSize: 32, fontWeight: FontWeight.w700, color: SmhitColors.ink),
    displayMedium: GoogleFonts.sora(fontSize: 26, fontWeight: FontWeight.w700, color: SmhitColors.ink),
    headlineMedium: GoogleFonts.sora(fontSize: 22, fontWeight: FontWeight.w600, color: SmhitColors.ink),
    headlineSmall: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w600, color: SmhitColors.ink),
    titleMedium: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w600, color: SmhitColors.ink),
    bodyLarge: GoogleFonts.inter(fontSize: 15, color: SmhitColors.ink),
    bodyMedium: GoogleFonts.inter(fontSize: 13.5, color: SmhitColors.muted),
    labelLarge: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
  );

  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: SmhitColors.brand, brightness: Brightness.light),
    scaffoldBackgroundColor: SmhitColors.bg,
    textTheme: textTheme,
    fontFamily: GoogleFonts.inter().fontFamily,
  );

  return base.copyWith(
    colorScheme: base.colorScheme.copyWith(
      primary: SmhitColors.brand,
      surface: SmhitColors.surface,
      error: SmhitColors.danger,
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(smhitRadius)),
      color: SmhitColors.surface,
      margin: EdgeInsets.zero,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: SmhitColors.brand,
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 52),
        textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        elevation: 0,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: SmhitColors.ink,
        minimumSize: const Size(0, 52),
        textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
        side: const BorderSide(color: SmhitColors.border, width: 1.4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: SmhitColors.bg,
      foregroundColor: SmhitColors.ink,
      elevation: 0,
      titleTextStyle: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w600, color: SmhitColors.ink),
    ),
  );
}
