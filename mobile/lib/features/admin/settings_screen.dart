import 'package:flutter/material.dart';

import '../../core/widgets/placeholder_screen.dart';

class AdminSettingsScreen extends StatelessWidget {
  const AdminSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreen(
      title: 'Paramètres système',
      icon: Icons.settings_outlined,
      moduleNote: 'Seuils IA, matrices de risque, templates de commentaires — Module 8.',
    );
  }
}
