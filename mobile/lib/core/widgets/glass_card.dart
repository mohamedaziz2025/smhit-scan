import 'package:flutter/material.dart';
import '../../app/theme.dart';

/// Carte "premium" : fond blanc, coins généreux, ombre douce à deux couches,
/// fin liseré clair — la brique de base du design system (§12).
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;

  const GlassCard({super.key, required this.child, this.padding = const EdgeInsets.all(24)});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: SmhitColors.surface,
        borderRadius: BorderRadius.circular(smhitRadius),
        border: Border.all(color: SmhitColors.border, width: 1),
        boxShadow: smhitShadow(),
      ),
      child: child,
    );
  }
}
