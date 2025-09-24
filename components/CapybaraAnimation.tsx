/**
 * ? Capybara Animation Component
 * 
 * Modular animation system that combines body and head animations.
 * Supports different scales and expressions for various use cases.
 */

import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { 
  CapybaraAnimationSet, 
  BodyAnimationType, 
  HeadExpressionType, 
  AnimationScale 
} from '@/types/CapybaraAnimations';
import { 
  DEFAULT_BODY_ANIMATIONS, 
  SCALE_CONFIGS, 
  getCapybaraById,
  getBodyAnimation 
} from '@/constants/CapybaraAnimations';

interface CapybaraAnimationProps {
  capybaraId: string;
  bodyAnimation?: BodyAnimationType;
  headExpression?: HeadExpressionType;
  scale?: AnimationScale;
  showBody?: boolean;        // Whether to show body (false for head-only)
  showHead?: boolean;        // Whether to show head (false for body-only)
  style?: any;              // Additional styling
}

export const CapybaraAnimation: React.FC<CapybaraAnimationProps> = ({
  capybaraId,
  bodyAnimation = 'idle',
  headExpression = 'neutral',
  scale = 'medium',
  showBody = true,
  showHead = true,
  style,
}) => {
  // Get capybara data
  const capybara = getCapybaraById(capybaraId);
  if (!capybara) {
    console.warn(`Capybara with id "${capybaraId}" not found`);
    return null;
  }

  // Get animations
  const bodyAnimations = getBodyAnimation(capybaraId);
  const scaleConfig = SCALE_CONFIGS[scale];
  
  // Calculate dimensions
  const containerSize = scaleConfig.containerSize;
  const bodyScale = scaleConfig.bodyScale;
  const headScale = scaleConfig.headScale * capybara.headScale;
  
  // Get animation sources
  const bodySource = bodyAnimations[bodyAnimation].source;
  const headSource = capybara.head[headExpression].source;
  
  // Calculate positions
  const headOffsetX = capybara.headOffset.x * bodyScale;
  const headOffsetY = capybara.headOffset.y * bodyScale;

  return (
    <View style={[styles.container, { 
      width: containerSize.width, 
      height: containerSize.height 
    }, style]}>
      
      {/* Body Animation */}
      {showBody && (
        <Image
          source={bodySource}
          style={[
            styles.bodyAnimation,
            {
              width: bodyAnimations[bodyAnimation].width * bodyScale,
              height: bodyAnimations[bodyAnimation].height * bodyScale,
            }
          ]}
          resizeMode="contain"
        />
      )}
      
      {/* Head Animation */}
      {showHead && (
        <Image
          source={headSource}
          style={[
            styles.headAnimation,
            {
              width: capybara.head[headExpression].width * headScale,
              height: capybara.head[headExpression].height * headScale,
              left: headOffsetX,
              top: headOffsetY,
            }
          ]}
          resizeMode="contain"
        />
      )}
    </View>
  );
};

// Head-only component for unlock screens, etc.
export const CapybaraHead: React.FC<{
  capybaraId: string;
  expression?: HeadExpressionType;
  scale?: AnimationScale;
  style?: any;
}> = ({ capybaraId, expression = 'neutral', scale = 'small', style }) => {
  return (
    <CapybaraAnimation
      capybaraId={capybaraId}
      headExpression={expression}
      scale={scale}
      showBody={false}
      showHead={true}
      style={style}
    />
  );
};

// Body-only component (rarely used, but available)
export const CapybaraBody: React.FC<{
  capybaraId?: string;
  animation?: BodyAnimationType;
  scale?: AnimationScale;
  style?: any;
}> = ({ capybaraId = 'basic-capy', animation = 'idle', scale = 'medium', style }) => {
  return (
    <CapybaraAnimation
      capybaraId={capybaraId}
      bodyAnimation={animation}
      scale={scale}
      showBody={true}
      showHead={false}
      style={style}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  bodyAnimation: {
    position: 'absolute',
  },
  
  headAnimation: {
    position: 'absolute',
    zIndex: 10, // Head appears above body
  },
});
