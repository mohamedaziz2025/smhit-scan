import 'package:flutter/material.dart';

import '../../core/widgets/placeholder_screen.dart';

/// Onglets "Temps réel" (camera) / "Upload" (image_picker) — §11.
/// Pipeline caméra + envoi POST /fiches/scan : Module 6.
class ScanScreen extends StatelessWidget {
  const ScanScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreen(
      title: 'Scanner une fiche',
      icon: Icons.document_scanner_outlined,
      moduleNote:
          'Caméra temps réel + upload galerie/PDF, envoi vers POST /fiches/scan — Module 6.',
    );
  }
}
