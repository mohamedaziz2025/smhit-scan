import 'package:flutter/material.dart';

import '../../core/widgets/placeholder_screen.dart';

/// Historique des fiches de l'agent connecté — §11.
class MyFichesScreen extends StatelessWidget {
  const MyFichesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreen(
      title: 'Mes fiches',
      icon: Icons.assignment_outlined,
      moduleNote: 'Liste GET /fiches?agentId=me, filtrable par statut/date — Module 6.',
    );
  }
}
