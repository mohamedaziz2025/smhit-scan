import 'package:flutter/material.dart';
import '../../app/theme.dart';

/// Bouton premium à fond dégradé + micro-interaction tactile (scale au
/// press, 150ms — §12 "micro-animations, feedback haptique mobile").
class GradientButton extends StatefulWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;

  const GradientButton({super.key, required this.label, this.icon, this.onPressed});

  @override
  State<GradientButton> createState() => _GradientButtonState();
}

class _GradientButtonState extends State<GradientButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapCancel: () => setState(() => _pressed = false),
      onTapUp: (_) => setState(() => _pressed = false),
      onTap: widget.onPressed,
      child: AnimatedScale(
        scale: _pressed ? 0.97 : 1,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        child: Container(
          height: 52,
          decoration: BoxDecoration(
            gradient: SmhitColors.brandGradient,
            borderRadius: BorderRadius.circular(14),
            boxShadow: _pressed ? [] : smhitBrandShadow(),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (widget.icon != null) ...[
                Icon(widget.icon, color: Colors.white, size: 18),
                const SizedBox(width: 8),
              ],
              Text(
                widget.label,
                style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
