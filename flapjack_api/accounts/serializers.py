from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={
                                     "input_type":   "password"})
    password2 = serializers.CharField(
        style={"input_type": "password"}, write_only=True, label="Confirm password")
    # Required because the rest of the application uses email as an identifier:
    # sign-in accepts it, and the share picker searches and shares by it, so an
    # account without one cannot be shared with.
    email = serializers.EmailField(required=True, allow_blank=False)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password2",
        ]
        extra_kwargs = {"password": {"write_only": True}}

    def validate(self, attrs):
        """These checks used to live in create(), which runs after is_valid()."""
        email = attrs.get("email")
        username = attrs.get("username")
        password = attrs.get("password")

        if User.objects.filter(email__iexact=email).exclude(username=username).exists():
            raise serializers.ValidationError(
                {"email": "Email addresses must be unique."})
        if password != attrs.get("password2"):
            raise serializers.ValidationError(
                {"password": "The two passwords differ."})

        try:
            validate_password(password, User(username=username, email=email))
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        return attrs

    def create(self, validated_data):
        user = User(
            username=validated_data["username"],
            email=validated_data["email"],
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class CurrentPasswordSerializer(serializers.Serializer):
    """Base for account changes that must re-prove the password.

    A stolen access token is otherwise enough to take an account permanently:
    move the address, then change the password. Requiring the password on every
    such change keeps a leaked token limited to the life of that token.
    """

    current_password = serializers.CharField(write_only=True, required=True, style={
        "input_type": "password"})

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


class ChangePasswordSerializer(CurrentPasswordSerializer):
    new_password = serializers.CharField(write_only=True, required=True, style={
        "input_type": "password"})
    new_password2 = serializers.CharField(write_only=True, required=True, style={
        "input_type": "password"}, label="Confirm new password")

    def validate(self, attrs):
        user = self.context["request"].user
        new = attrs["new_password"]
        if new != attrs["new_password2"]:
            raise serializers.ValidationError(
                {"new_password": "The two passwords differ."})
        if new == attrs["current_password"]:
            raise serializers.ValidationError(
                {"new_password": "The new password matches the current one."})
        try:
            validate_password(new, user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"new_password": list(e.messages)})
        return attrs


class ChangeEmailSerializer(CurrentPasswordSerializer):
    email = serializers.EmailField(required=True, allow_blank=False)

    def validate_email(self, value):
        user = self.context["request"].user
        # Excluding your own row is right for a real change, but it would also
        # let the address you already hold pass as a change.
        if value.lower() == (user.email or "").lower():
            raise serializers.ValidationError("That is already your email address.")
        if User.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Email addresses must be unique.")
        return value


class ChangeUsernameSerializer(CurrentPasswordSerializer):
    username = serializers.CharField(required=True, max_length=150)

    def validate_username(self, value):
        user = self.context["request"].user
        if value == user.username:
            raise serializers.ValidationError("That is already your username.")
        if User.objects.filter(username__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("That username is taken.")
        # Reuse the model's own validator so the rules match registration.
        try:
            User._meta.get_field("username").run_validators(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
