import 'package:flutter/material.dart';

import '../../app/theme.dart';

/// Écran-gabarit pour les modules pas encore implémentés (squelette Module 1).
/// Chaque écran métier réel remplace ce widget au fil des modules 6/8 (§14).
class PlaceholderScreen extends StatelessWidget {
  final String title;
  final String moduleNote;
  final IconData icon;

  const PlaceholderScreen({
    super.key,
    required this.title,
    required this.moduleNote,
    this.icon = Icons.construction_outlined,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 48, color: SmhitColors.brand),
              const SizedBox(height: 16),
              Text(
                title,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                moduleNote,
                style: const TextStyle(color: SmhitColors.muted),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
