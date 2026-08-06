import 'package:flutter/material.dart';

/// Design system SMHIT — voir §12 du cahier des charges.
/// Orange SMHIT en accent, base neutre claire, coins arrondis 16px.
class SmhitColors {
  static const brand = Color(0xFFF26A21);
  static const brand600 = Color(0xFFD2551A);
  static const ink = Color(0xFF0F172A);
  static const muted = Color(0xFF64748B);
  static const bg = Color(0xFFF8FAFC);
  static const surface = Color(0xFFFFFFFF);
  static const success = Color(0xFF16A34A);
  static const warning = Color(0xFFF59E0B);
  static const danger = Color(0xFFDC2626);
}

const smhitRadius = 16.0;

ThemeData buildSmhitTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: SmhitColors.brand,
      brightness: Brightness.light,
    ),
    scaffoldBackgroundColor: SmhitColors.bg,
  );

  return base.copyWith(
    colorScheme: base.colorScheme.copyWith(
      primary: SmhitColors.brand,
      surface: SmhitColors.surface,
      error: SmhitColors.danger,
    ),
    cardTheme: CardThemeData(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(smhitRadius)),
      color: SmhitColors.surface,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: SmhitColors.brand,
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 48), // cible tactile ≥ 44px
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: SmhitColors.surface,
      foregroundColor: SmhitColors.ink,
      elevation: 0,
    ),
  );
}
