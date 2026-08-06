import 'package:flutter/material.dart';

import '../../core/widgets/placeholder_screen.dart';

class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreen(
      title: 'Rapports',
      icon: Icons.fact_check_outlined,
      moduleNote: 'File d\'attente de validation (GET /reports?status=PENDING_ADMIN) — Module 7/8.',
    );
  }
}
