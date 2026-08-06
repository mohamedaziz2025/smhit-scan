import 'package:flutter/material.dart';

import '../../core/widgets/placeholder_screen.dart';

class ReportDetailScreen extends StatelessWidget {
  final String reportId;
  const ReportDetailScreen({super.key, required this.reportId});

  @override
  Widget build(BuildContext context) {
    return PlaceholderScreen(
      title: 'Rapport #$reportId',
      icon: Icons.fact_check_outlined,
      moduleNote: 'Recommandations, corrections, preview PDF, Valider — Module 7/8.',
    );
  }
}
