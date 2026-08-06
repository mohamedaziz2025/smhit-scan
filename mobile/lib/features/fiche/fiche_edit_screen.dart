import 'package:flutter/material.dart';

import '../../core/widgets/placeholder_screen.dart';

/// Tableau postes/cases + résolution produit (réf -> nom) — §11.
/// Implémenté au Module 6, branché sur GET /products/resolve.
class FicheEditScreen extends StatelessWidget {
  final String ficheId;
  const FicheEditScreen({super.key, required this.ficheId});

  @override
  Widget build(BuildContext context) {
    return PlaceholderScreen(
      title: 'Fiche #$ficheId',
      icon: Icons.checklist_outlined,
      moduleNote:
          'Cases à cocher, réf. produit (GET /products/resolve), champs "à vérifier" — Module 6.',
    );
  }
}
